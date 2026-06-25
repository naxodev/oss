# nx-cloudflare D1 migrations & secrets executors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Nx targets to operate Cloudflare D1 migrations (`apply`/`create`/`list`) and Worker secrets (`put`/`bulk`/`list`/`delete`), created automatically by inference and backed by two typed custom executors.

**Architecture:** Two custom executors (`@naxodev/nx-cloudflare:d1`, `:secret`) each take a `command` discriminator. The `createNodes` inference plugin parses `wrangler.jsonc` and emits targets that point at these executors with `command` (and, for D1, `database`) baked into `options`. Each executor splits into a pure arg-builder (unit-tested) and a thin side-effecting `wrangler` wrapper (`src/utils/run-wrangler.ts`), mirroring the existing `provision.ts` / `run-wrangler-types.ts` split.

**Tech Stack:** TypeScript, `@nx/devkit` (`createNodes`, `ExecutorContext`), `jsonc-parser` (already a dep, via `@nx/devkit`'s `parseJson`), `bun:test`, Wrangler v4 CLI.

## Global Constraints

- Package name for executor references: **`@naxodev/nx-cloudflare`** (e.g. `@naxodev/nx-cloudflare:d1`).
- Tests run on **`bun test`** via the per-file runner; run a single spec with `cd packages/nx-cloudflare && bun test <path>`.
- Type-check / build: **`bunx nx build nx-cloudflare`** (`@nx/js:tsc`). Lint: **`bunx nx lint nx-cloudflare`** (includes `@nx/nx-plugin-checks`).
- **jsonc/json only** for D1 inference — there is no TOML parser in `plugin.ts`; TOML configs get no D1 targets.
- **D1 commands always pass an explicit `--local`/`--remote`** (`apply`/`list`); `apply` defaults to **local** (`remote: false`).
- **Never pass secret values as CLI args.** `secret put`/`delete` take only the KEY; `bulk` takes a JSON file path. Executors inherit stdio so `secret put`'s interactive prompt works.
- Conventional Commits with scope, e.g. `feat(nx-cloudflare): ...`. User prefers **jujutsu** (`jj commit -m`).
- DO/Worker `[[migrations]]` blocks are out of scope (already handled by the `binding` generator).

## File Structure

- `packages/nx-cloudflare/src/utils/run-wrangler.ts` — **new.** Shared side-effecting `wrangler` runner (no unit test, mirrors `run-wrangler-types.ts`; covered by e2e).
- `packages/nx-cloudflare/src/executors/d1/{executor.ts,schema.json,schema.d.ts,executor.spec.ts}` — **new.** D1 migrations executor + pure `buildD1Args`.
- `packages/nx-cloudflare/src/executors/secret/{executor.ts,schema.json,schema.d.ts,executor.spec.ts}` — **new.** Secrets executor + pure `buildSecretArgs`.
- `packages/nx-cloudflare/executors.json` — **new.** Executor manifest.
- `packages/nx-cloudflare/package.json` — **modify.** `exports` map: add executor entries.
- `packages/nx-cloudflare/project.json` — **modify.** `build.options.assets`: copy `executors.json`.
- `packages/nx-cloudflare/src/plugin.ts` — **modify.** Parse `d1_databases`, emit D1 + secret targets, add option fields.
- `packages/nx-cloudflare/src/plugin.spec.ts` — **modify.** Update the exact-target-set assertion; add D1/secret inference tests.
- `packages/nx-cloudflare/README.md` — **modify.** Document the new targets.

---

### Task 1: D1 executor (`buildD1Args` + executor + shared runner)

**Files:**

- Create: `packages/nx-cloudflare/src/utils/run-wrangler.ts`
- Create: `packages/nx-cloudflare/src/executors/d1/schema.d.ts`
- Create: `packages/nx-cloudflare/src/executors/d1/executor.ts`
- Test: `packages/nx-cloudflare/src/executors/d1/executor.spec.ts`

**Interfaces:**

- Produces: `runWrangler(args: string[], cwd: string): boolean` (in `utils/run-wrangler.ts`)
- Produces: `type D1Command = 'apply' | 'create' | 'list'`; `interface D1ExecutorSchema { command: D1Command; database: string; remote?: boolean; env?: string; message?: string }`
- Produces: `buildD1Args(options: D1ExecutorSchema): string[]` (named export from `executor.ts`)
- Produces: `default async (options: D1ExecutorSchema, context: ExecutorContext) => Promise<{ success: boolean }>`

- [ ] **Step 1: Write `schema.d.ts`** (no test; type definitions consumed by later steps)

```typescript
// packages/nx-cloudflare/src/executors/d1/schema.d.ts
export type D1Command = 'apply' | 'create' | 'list';

export interface D1ExecutorSchema {
  /** Baked in by inference. */
  command: D1Command;
  /** The D1 `database_name`. Baked in by inference. */
  database: string;
  /** `false` -> `--local` (default), `true` -> `--remote`. Ignored for `create`. */
  remote?: boolean;
  /** Cloudflare environment -> `--env <env>`. Ignored for `create`. */
  env?: string;
  /** Required for `create`: the migration message. */
  message?: string;
}
```

- [ ] **Step 2: Write the shared `run-wrangler.ts`** (no unit test — side-effect module, mirrors `run-wrangler-types.ts`, verified by e2e)

```typescript
// packages/nx-cloudflare/src/utils/run-wrangler.ts
import { execFileSync } from 'node:child_process';

// Side-effecting wrangler invocation shared by the d1 and secret executors.
// Mirrors run-wrangler-types: isolated so callers can be unit-tested by mocking
// it, and so the pure arg-builders stay free of I/O. stdio is inherited so
// interactive prompts (e.g. `wrangler secret put`) and wrangler's own error
// output reach the user. Returns false on a non-zero exit.
export function runWrangler(args: string[], cwd: string): boolean {
  try {
    execFileSync('wrangler', args, { cwd, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Write the failing test for `buildD1Args`**

```typescript
// packages/nx-cloudflare/src/executors/d1/executor.spec.ts
import { describe, it, expect } from 'bun:test';
import { buildD1Args } from './executor';

describe('buildD1Args', () => {
  it('builds a local apply by default', () => {
    expect(buildD1Args({ command: 'apply', database: 'my-db' })).toEqual(['d1', 'migrations', 'apply', 'my-db', '--local']);
  });

  it('builds a remote apply when remote is true', () => {
    expect(buildD1Args({ command: 'apply', database: 'my-db', remote: true })).toEqual(['d1', 'migrations', 'apply', 'my-db', '--remote']);
  });

  it('threads --env for apply/list', () => {
    expect(buildD1Args({ command: 'list', database: 'my-db', env: 'staging' })).toEqual(['d1', 'migrations', 'list', 'my-db', '--local', '--env', 'staging']);
  });

  it('builds create with the message and no local/remote flag', () => {
    expect(buildD1Args({ command: 'create', database: 'my-db', message: 'add_users' })).toEqual(['d1', 'migrations', 'create', 'my-db', 'add_users']);
  });

  it('throws when create has no message', () => {
    expect(() => buildD1Args({ command: 'create', database: 'my-db' })).toThrow('The `message` option is required');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd packages/nx-cloudflare && bun test src/executors/d1/executor.spec.ts`
Expected: FAIL — `Cannot find module './executor'` (executor.ts not created yet).

- [ ] **Step 5: Write `executor.ts`**

```typescript
// packages/nx-cloudflare/src/executors/d1/executor.ts
import { join } from 'node:path';
import { logger, type ExecutorContext } from '@nx/devkit';
import { runWrangler } from '../../utils/run-wrangler';
import type { D1ExecutorSchema } from './schema';

// Pure: build the `wrangler d1 migrations <command>` argv. `apply`/`list`
// require an explicit local/remote target (wrangler errors without one); the
// repo defaults to local. `create` writes a local file only, so it takes the
// message and neither a local/remote nor an --env flag.
export function buildD1Args(options: D1ExecutorSchema): string[] {
  const { command, database, remote, env, message } = options;
  if (command === 'create') {
    if (!message) {
      throw new Error('The `message` option is required for `d1 migrations create`.');
    }
    return ['d1', 'migrations', 'create', database, message];
  }
  const args = ['d1', 'migrations', command, database, remote ? '--remote' : '--local'];
  if (env) {
    args.push('--env', env);
  }
  return args;
}

export default async function d1Executor(options: D1ExecutorSchema, context: ExecutorContext): Promise<{ success: boolean }> {
  if (!context.projectName) {
    logger.error('d1 executor: no project in context.');
    return { success: false };
  }
  const projectRoot = context.projectsConfigurations.projects[context.projectName].root;
  try {
    return { success: runWrangler(buildD1Args(options), join(context.root, projectRoot)) };
  } catch (e) {
    logger.error(e instanceof Error ? e.message : String(e));
    return { success: false };
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/nx-cloudflare && bun test src/executors/d1/executor.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
jj commit -m "feat(nx-cloudflare): add d1 migrations executor"
```

---

### Task 2: Secret executor (`buildSecretArgs` + executor)

**Files:**

- Create: `packages/nx-cloudflare/src/executors/secret/schema.d.ts`
- Create: `packages/nx-cloudflare/src/executors/secret/executor.ts`
- Test: `packages/nx-cloudflare/src/executors/secret/executor.spec.ts`

**Interfaces:**

- Consumes: `runWrangler` from `utils/run-wrangler.ts` (Task 1)
- Produces: `type SecretCommand = 'put' | 'bulk' | 'list' | 'delete'`; `interface SecretExecutorSchema { command: SecretCommand; name?: string; file?: string; env?: string }`
- Produces: `buildSecretArgs(options: SecretExecutorSchema): string[]` (named export)
- Produces: `default async (options, context: ExecutorContext) => Promise<{ success: boolean }>`

- [ ] **Step 1: Write `schema.d.ts`**

```typescript
// packages/nx-cloudflare/src/executors/secret/schema.d.ts
export type SecretCommand = 'put' | 'bulk' | 'list' | 'delete';

export interface SecretExecutorSchema {
  /** Baked in by inference. */
  command: SecretCommand;
  /** The secret KEY. Required for `put`/`delete`. */
  name?: string;
  /** JSON file of secrets. Required for `bulk`. */
  file?: string;
  /** Cloudflare environment -> `--env <env>`. */
  env?: string;
}
```

- [ ] **Step 2: Write the failing test for `buildSecretArgs`**

```typescript
// packages/nx-cloudflare/src/executors/secret/executor.spec.ts
import { describe, it, expect } from 'bun:test';
import { buildSecretArgs } from './executor';

describe('buildSecretArgs', () => {
  it('builds put with the key name', () => {
    expect(buildSecretArgs({ command: 'put', name: 'API_KEY' })).toEqual(['secret', 'put', 'API_KEY']);
  });

  it('builds delete with the key name and --env', () => {
    expect(buildSecretArgs({ command: 'delete', name: 'API_KEY', env: 'production' })).toEqual(['secret', 'delete', 'API_KEY', '--env', 'production']);
  });

  it('builds bulk with the file path', () => {
    expect(buildSecretArgs({ command: 'bulk', file: 'secrets.json' })).toEqual(['secret', 'bulk', 'secrets.json']);
  });

  it('builds list with no positional arg', () => {
    expect(buildSecretArgs({ command: 'list' })).toEqual(['secret', 'list']);
  });

  it('throws when put has no name', () => {
    expect(() => buildSecretArgs({ command: 'put' })).toThrow('The `name` option is required');
  });

  it('throws when bulk has no file', () => {
    expect(() => buildSecretArgs({ command: 'bulk' })).toThrow('The `file` option is required');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd packages/nx-cloudflare && bun test src/executors/secret/executor.spec.ts`
Expected: FAIL — `Cannot find module './executor'`.

- [ ] **Step 4: Write `executor.ts`**

```typescript
// packages/nx-cloudflare/src/executors/secret/executor.ts
import { join } from 'node:path';
import { logger, type ExecutorContext } from '@nx/devkit';
import { runWrangler } from '../../utils/run-wrangler';
import type { SecretExecutorSchema } from './schema';

// Pure: build the `wrangler secret <command>` argv. `put`/`delete` take only
// the KEY (never the value — wrangler prompts for it); `bulk` takes a JSON
// file; `list` takes no positional. Secret values are never passed as args.
export function buildSecretArgs(options: SecretExecutorSchema): string[] {
  const { command, name, file, env } = options;
  const args = ['secret', command];
  switch (command) {
    case 'put':
    case 'delete':
      if (!name) {
        throw new Error(`The \`name\` option is required for \`secret ${command}\`.`);
      }
      args.push(name);
      break;
    case 'bulk':
      if (!file) {
        throw new Error('The `file` option is required for `secret bulk`.');
      }
      args.push(file);
      break;
    case 'list':
      break;
  }
  if (env) {
    args.push('--env', env);
  }
  return args;
}

export default async function secretExecutor(options: SecretExecutorSchema, context: ExecutorContext): Promise<{ success: boolean }> {
  if (!context.projectName) {
    logger.error('secret executor: no project in context.');
    return { success: false };
  }
  const projectRoot = context.projectsConfigurations.projects[context.projectName].root;
  try {
    return { success: runWrangler(buildSecretArgs(options), join(context.root, projectRoot)) };
  } catch (e) {
    logger.error(e instanceof Error ? e.message : String(e));
    return { success: false };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/nx-cloudflare && bun test src/executors/secret/executor.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
jj commit -m "feat(nx-cloudflare): add secrets executor"
```

---

### Task 3: Register executors (manifest, schemas, exports, build assets)

**Files:**

- Create: `packages/nx-cloudflare/src/executors/d1/schema.json`
- Create: `packages/nx-cloudflare/src/executors/secret/schema.json`
- Create: `packages/nx-cloudflare/executors.json`
- Modify: `packages/nx-cloudflare/package.json` (`exports`)
- Modify: `packages/nx-cloudflare/project.json` (`build.options.assets`)

**Interfaces:**

- Consumes: executor files from Tasks 1–2.
- Produces: resolvable executors `@naxodev/nx-cloudflare:d1` and `@naxodev/nx-cloudflare:secret`.

- [ ] **Step 1: Write the D1 executor `schema.json`**

```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "NxCloudflareD1",
  "title": "Run Cloudflare D1 migrations",
  "description": "Runs `wrangler d1 migrations <command>` for a Worker's D1 database.",
  "type": "object",
  "properties": {
    "command": {
      "description": "The D1 migrations subcommand. Baked in by inference.",
      "type": "string",
      "enum": ["apply", "create", "list"],
      "x-priority": "internal"
    },
    "database": {
      "description": "The D1 database name. Baked in by inference.",
      "type": "string",
      "x-priority": "internal"
    },
    "remote": {
      "description": "Apply/list against the remote database (`--remote`) instead of local (`--local`).",
      "type": "boolean",
      "default": false
    },
    "env": {
      "description": "Cloudflare environment (`--env`).",
      "type": "string"
    },
    "message": {
      "description": "Migration message. Required for `create`.",
      "type": "string"
    }
  },
  "required": ["command", "database"]
}
```

- [ ] **Step 2: Write the secret executor `schema.json`**

```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "NxCloudflareSecret",
  "title": "Manage Cloudflare Worker secrets",
  "description": "Runs `wrangler secret <command>` for a Worker. Secret values are never passed as arguments.",
  "type": "object",
  "properties": {
    "command": {
      "description": "The secret subcommand. Baked in by inference.",
      "type": "string",
      "enum": ["put", "bulk", "list", "delete"],
      "x-priority": "internal"
    },
    "name": {
      "description": "The secret KEY. Required for `put`/`delete`.",
      "type": "string"
    },
    "file": {
      "description": "Path to a JSON file of secrets. Required for `bulk`.",
      "type": "string"
    },
    "env": {
      "description": "Cloudflare environment (`--env`).",
      "type": "string"
    }
  },
  "required": ["command"]
}
```

- [ ] **Step 3: Write `executors.json`**

```json
{
  "executors": {
    "d1": {
      "implementation": "./src/executors/d1/executor",
      "schema": "./src/executors/d1/schema.json",
      "description": "Run Cloudflare D1 migrations (apply/create/list)."
    },
    "secret": {
      "implementation": "./src/executors/secret/executor",
      "schema": "./src/executors/secret/schema.json",
      "description": "Manage Cloudflare Worker secrets (put/bulk/list/delete)."
    }
  }
}
```

- [ ] **Step 4: Add executor entries to `package.json` `exports`**

Add these keys to the existing `exports` object (after the `./src/generators/*/schema` entry):

```json
    "./executors.json": "./executors.json",
    "./src/executors/*/executor": "./src/executors/*/executor.js",
    "./src/executors/*/schema.json": "./src/executors/*/schema.json",
    "./src/executors/*/schema": "./src/executors/*/schema.d.ts"
```

- [ ] **Step 5: Copy `executors.json` in the build**

In `packages/nx-cloudflare/project.json`, add an entry to `build.options.assets` (next to the existing `generators.json`/`migrations.json` globs):

```json
{
  "input": "./packages/nx-cloudflare",
  "glob": "executors.json",
  "output": "./"
}
```

- [ ] **Step 6: Verify lint (nx-plugin-checks) and build pass**

Run: `bunx nx lint nx-cloudflare`
Expected: PASS — `@nx/nx-plugin-checks` validates `executors.json` points to real implementation + schema files.

Run: `bunx nx build nx-cloudflare`
Expected: PASS — type-checks the new executors; `dist/packages/nx-cloudflare/executors.json` exists afterward.

- [ ] **Step 7: Commit**

```bash
jj commit -m "feat(nx-cloudflare): register d1 and secret executors"
```

---

### Task 4: Inference — emit D1 + secret targets

**Files:**

- Modify: `packages/nx-cloudflare/src/plugin.ts`
- Modify: `packages/nx-cloudflare/src/plugin.spec.ts`

**Interfaces:**

- Consumes: executors `@naxodev/nx-cloudflare:d1` / `:secret` (Tasks 1–3).
- Produces: targets `d1-apply`/`d1-create`/`d1-list` (suffixed by binding when >1 D1 db) and `secret-put`/`secret-bulk`/`secret-list`/`secret-delete`, all override-able via new `CloudflarePluginOptions` fields.

- [ ] **Step 1: Update the existing exact-target-set test (it will otherwise break)**

In `packages/nx-cloudflare/src/plugin.spec.ts`, the test `'infers the five Worker targets for a valid jsonc config'` asserts the target keys equal exactly the five Worker targets. Secret targets are now always emitted, so update that assertion (the config in that test has no `d1_databases`, so no D1 targets appear):

```typescript
expect(Object.keys(targets).sort()).toEqual(['deploy', 'serve', 'tail', 'typegen', 'version-upload', 'secret-put', 'secret-bulk', 'secret-list', 'secret-delete'].sort());
```

- [ ] **Step 2: Write the failing inference tests**

Add to `packages/nx-cloudflare/src/plugin.spec.ts`, inside the top-level `describe`:

```typescript
it('emits secret targets pointing at the secret executor for every worker', async () => {
  writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
  writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker","main":"src/index.ts"}');

  const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
  const targets = result.projects['apps/worker'].targets;

  expect(targets['secret-put']).toEqual({
    executor: '@naxodev/nx-cloudflare:secret',
    options: { command: 'put' },
  });
  expect(targets['secret-bulk'].options).toEqual({ command: 'bulk' });
});

it('emits bare d1 targets when there is exactly one D1 binding', async () => {
  writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
  writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker","d1_databases":[{"binding":"DB","database_name":"my-db"}]}');

  const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
  const targets = result.projects['apps/worker'].targets;

  expect(targets['d1-apply']).toEqual({
    executor: '@naxodev/nx-cloudflare:d1',
    options: { command: 'apply', database: 'my-db' },
  });
  expect(targets['d1-create'].options).toEqual({
    command: 'create',
    database: 'my-db',
  });
  expect(targets['d1-list']).toBeDefined();
  expect(targets['d1-apply-DB']).toBeUndefined();
});

it('suffixes d1 targets by binding when there are multiple D1 bindings', async () => {
  writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
  writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker","d1_databases":[' + '{"binding":"DB","database_name":"main"},' + '{"binding":"ANALYTICS","database_name":"events"}]}');

  const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
  const targets = result.projects['apps/worker'].targets;

  expect(targets['d1-apply-DB'].options).toEqual({
    command: 'apply',
    database: 'main',
  });
  expect(targets['d1-apply-ANALYTICS'].options).toEqual({
    command: 'apply',
    database: 'events',
  });
  expect(targets['d1-apply']).toBeUndefined();
});

it('emits no d1 targets when there is no D1 binding', async () => {
  writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
  writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker","main":"src/index.ts"}');

  const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
  const targets = result.projects['apps/worker'].targets;

  expect(Object.keys(targets).filter((k) => k.startsWith('d1-'))).toEqual([]);
});

it('honors custom target-name overrides', async () => {
  writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
  writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker","d1_databases":[{"binding":"DB","database_name":"my-db"}]}');

  const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc', {
    d1ApplyTargetName: 'migrate',
    secretPutTargetName: 'add-secret',
  });
  const targets = result.projects['apps/worker'].targets;

  expect(targets['migrate'].options).toEqual({
    command: 'apply',
    database: 'my-db',
  });
  expect(targets['add-secret'].options).toEqual({ command: 'put' });
});
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `cd packages/nx-cloudflare && bun test src/plugin.spec.ts`
Expected: FAIL — new target keys are `undefined` (inference not implemented yet).

- [ ] **Step 4: Extend `CloudflarePluginOptions` and `normalizeOptions` in `plugin.ts`**

Add to the `CloudflarePluginOptions` interface (after `tailTargetName`):

```typescript
  /** Name for the inferred `d1 migrations apply` target. @default 'd1-apply' */
  d1ApplyTargetName?: string;
  /** Name for the inferred `d1 migrations create` target. @default 'd1-create' */
  d1CreateTargetName?: string;
  /** Name for the inferred `d1 migrations list` target. @default 'd1-list' */
  d1ListTargetName?: string;
  /** Name for the inferred `secret put` target. @default 'secret-put' */
  secretPutTargetName?: string;
  /** Name for the inferred `secret bulk` target. @default 'secret-bulk' */
  secretBulkTargetName?: string;
  /** Name for the inferred `secret list` target. @default 'secret-list' */
  secretListTargetName?: string;
  /** Name for the inferred `secret delete` target. @default 'secret-delete' */
  secretDeleteTargetName?: string;
```

Add to the `normalizeOptions` return object (after `tailTargetName`):

```typescript
    d1ApplyTargetName: options?.d1ApplyTargetName ?? 'd1-apply',
    d1CreateTargetName: options?.d1CreateTargetName ?? 'd1-create',
    d1ListTargetName: options?.d1ListTargetName ?? 'd1-list',
    secretPutTargetName: options?.secretPutTargetName ?? 'secret-put',
    secretBulkTargetName: options?.secretBulkTargetName ?? 'secret-bulk',
    secretListTargetName: options?.secretListTargetName ?? 'secret-list',
    secretDeleteTargetName: options?.secretDeleteTargetName ?? 'secret-delete',
```

- [ ] **Step 5: Add the D1-database parser and target builders in `plugin.ts`**

Add the `D1Database` type and parser (place after `readValidConfig`). Note `parseJson` is already imported from `@nx/devkit` and handles jsonc comments:

```typescript
interface D1Database {
  binding: string;
  database_name: string;
}

/**
 * Extract `d1_databases` entries with both a `binding` and `database_name`.
 * Returns [] for TOML (no parser here) or any parse/shape failure — inference
 * must never throw, and D1 targets are jsonc/json-only by design.
 */
function readD1Databases(absConfigPath: string, content: string): D1Database[] {
  if (absConfigPath.endsWith('.toml')) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = parseJson(content);
  } catch {
    return [];
  }
  const list = (parsed as Record<string, unknown> | null)?.['d1_databases'];
  if (!Array.isArray(list)) {
    return [];
  }
  return list.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }
    const { binding, database_name } = entry as Record<string, unknown>;
    return typeof binding === 'string' && typeof database_name === 'string' ? [{ binding, database_name }] : [];
  });
}
```

Add the two target builders (place after `buildWorkerTargets`):

```typescript
/** D1 migration targets, one trio per database. Suffixed by binding when >1. */
function buildD1Targets(options: NormalizedOptions, databases: D1Database[]): Record<string, TargetConfiguration> {
  const single = databases.length === 1;
  const targets: Record<string, TargetConfiguration> = {};
  for (const db of databases) {
    const suffix = single ? '' : `-${db.binding}`;
    const d1 = (command: string): TargetConfiguration => ({
      executor: '@naxodev/nx-cloudflare:d1',
      options: { command, database: db.database_name },
    });
    targets[`${options.d1ApplyTargetName}${suffix}`] = d1('apply');
    targets[`${options.d1CreateTargetName}${suffix}`] = d1('create');
    targets[`${options.d1ListTargetName}${suffix}`] = d1('list');
  }
  return targets;
}

/** Secret targets — always emitted (secrets never appear in the config). */
function buildSecretTargets(options: NormalizedOptions): Record<string, TargetConfiguration> {
  const secret = (command: string): TargetConfiguration => ({
    executor: '@naxodev/nx-cloudflare:secret',
    options: { command },
  });
  return {
    [options.secretPutTargetName]: secret('put'),
    [options.secretBulkTargetName]: secret('bulk'),
    [options.secretListTargetName]: secret('list'),
    [options.secretDeleteTargetName]: secret('delete'),
  };
}
```

- [ ] **Step 6: Wire the builders into `createNodesInternal`**

In `createNodesInternal`, replace the config-validity check and target construction. Currently:

```typescript
const absConfigPath = join(context.workspaceRoot, configFile);
if (readValidConfig(absConfigPath) === null) {
  return {};
}

const targets = buildWorkerTargets(projectRoot, normalizeOptions(options));
return { projects: { [projectRoot]: { targets } } };
```

Replace with (capture the validated content so it can be parsed for D1):

```typescript
const absConfigPath = join(context.workspaceRoot, configFile);
const content = readValidConfig(absConfigPath);
if (content === null) {
  return {};
}

const normalized = normalizeOptions(options);
const targets = {
  ...buildWorkerTargets(projectRoot, normalized),
  ...buildD1Targets(normalized, readD1Databases(absConfigPath, content)),
  ...buildSecretTargets(normalized),
};
return { projects: { [projectRoot]: { targets } } };
```

- [ ] **Step 7: Run the full plugin spec to verify it passes**

Run: `cd packages/nx-cloudflare && bun test src/plugin.spec.ts`
Expected: PASS — updated exact-set test plus the 5 new tests pass.

- [ ] **Step 8: Type-check / build**

Run: `bunx nx build nx-cloudflare`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
jj commit -m "feat(nx-cloudflare): infer d1 migration and secret targets"
```

---

### Task 5: Documentation

**Files:**

- Modify: `packages/nx-cloudflare/README.md`

**Interfaces:**

- Consumes: the target names/behaviors finalized in Task 4.

- [ ] **Step 1: Add the targets to the README Features list**

In `packages/nx-cloudflare/README.md`, under `## Features`, after the existing inferred-targets bullet (the one listing `serve`, `deploy`, `typegen`, `version-upload`, `tail`), add:

```markdown
- Inferred D1 migration targets (`d1-apply`, `d1-create`, `d1-list`) for each D1 binding, and secret targets (`secret-put`, `secret-bulk`, `secret-list`, `secret-delete`) for every Worker — backed by the `:d1` and `:secret` executors.
```

- [ ] **Step 2: Add a usage section**

After the `### Add a binding to a Worker` section in `README.md`, add:

```markdown
### Run D1 migrations

For each D1 binding in `wrangler.jsonc`, the plugin infers `d1-apply`, `d1-create`, and `d1-list` targets (suffixed by binding name when a Worker has multiple D1 databases, e.g. `d1-apply-DB`). D1 inference is **jsonc/json only**.

\`\`\`sh
nx d1-create my-worker --message=add_users # scaffold a migration
nx d1-apply my-worker # apply locally (default)
nx d1-apply my-worker --remote # apply to the remote database
nx d1-list my-worker --remote # list pending migrations
\`\`\`

### Manage secrets

Every Worker gets `secret-put`, `secret-bulk`, `secret-list`, and `secret-delete`.

\`\`\`sh
nx secret-put my-worker --name=API_KEY # interactive prompt for the value
nx secret-bulk my-worker --file=secrets.json # upload many from a JSON file
nx secret-list my-worker
nx secret-delete my-worker --name=API_KEY
\`\`\`

Secret values are never passed as arguments — `secret-put` prompts interactively, `secret-bulk` reads a JSON file (do not commit it). All targets accept `--env <environment>`.
```

(Replace the `\`\`\`` fences above with real triple-backticks when editing.)

- [ ] **Step 3: Verify formatting**

Run: `bunx nx format:check`
Expected: PASS (or run `bunx nx format:write` then re-check).

- [ ] **Step 4: Commit**

```bash
jj commit -m "docs(nx-cloudflare): document d1 migration and secret targets"
```

---

## Final verification (after all tasks)

- [ ] Run the full project test + lint + build:

```bash
bunx nx run-many -t test lint build -p nx-cloudflare
```

Expected: all PASS. This covers the new executors, the inference changes, `nx-plugin-checks` over the new `executors.json`/exports, and the type-check.

## Self-Review notes

- **Spec coverage:** d1 executor (Task 1), secret executor incl. interactive `put` via inherited stdio (Task 2), manifests/exports/build-assets (Task 3), inference with jsonc-only D1 parsing + single-vs-multi-db naming + always-on secrets + name overrides + local-default apply (Task 4), docs incl. jsonc-only and local-default caveats (Task 5). All spec sections map to a task.
- **Type consistency:** `D1ExecutorSchema`/`buildD1Args`, `SecretExecutorSchema`/`buildSecretArgs`, `runWrangler(args, cwd)`, executor refs `@naxodev/nx-cloudflare:d1` / `:secret`, and the `{ command, database }` / `{ command }` option shapes are identical across executor code, schema, inference, and tests.
- **Breaking-test callout:** Task 4 Step 1 explicitly updates the pre-existing exact-target-set assertion that always-on secret targets would otherwise break.
