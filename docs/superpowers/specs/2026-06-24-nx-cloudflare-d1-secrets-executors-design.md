# nx-cloudflare: D1 migrations & secrets executors

**Date:** 2026-06-24
**Status:** Approved (design)
**Issue:** #132 (partial — D1 migrations + secrets DX)

## Problem

The `binding` generator (#185) made it trivial to _wire_ a D1/KV/R2/Queue/DO/Workflow/Service
binding into a Worker's `wrangler.jsonc`. But once a user adds a **D1** binding there is no
plugin-supported way to **operate** it: D1 schema migrations (`create`/`apply`/`list`) and
**secrets** (`put`/`bulk`/`list`/`delete`) are entirely manual `wrangler` invocations. This is the
"Day 2 ops" gap that directly follows the binding work — you can create and bind the resource, but
not run migrations against it or manage its secrets.

## Goal

Surface D1 migrations and Worker secrets as **Nx targets** with typed, validated arguments,
created **automatically by inference** (no hand-written `project.json`).

Non-goals (out of scope):

- DO/Worker `[[migrations]]` blocks — already handled by the `binding` generator
  (`getMigrationCount`, `migrationDefinesClass`).
- `.dev.vars` scaffolding — a separate concern, not part of this work.
- Auto-wiring `dependsOn` (e.g. making `deploy` depend on `d1-apply`) — too surprising; left to
  the user.
- TOML config support for D1 target inference — see Constraints.

## Approach

**Inference-driven targets backed by two custom executors.** Nx `createNodes` emits targets whose
`executor` points at a plugin executor with a `command` discriminator **baked in by inference** (the
user never types it). This combines zero-config target creation with typed argument control
(schema validation, `--help`, required-arg enforcement, prompts).

This **reintroduces the executor layer** the repo previously removed in favor of inferred
run-commands targets. That is a deliberate, justified trade: run-commands cannot give named,
validated arguments (`--name`, `--file`, `--remote`, `--env`), which is the whole point here.

### Two executors

#### `@naxodev/nx-cloudflare:d1` (`src/executors/d1`)

Wraps `wrangler d1 migrations <command>`. All D1 commands take the **database name** as their
positional argument (e.g. `wrangler d1 migrations apply my-database --remote`).

Schema options:

| Option     | Type                            | Notes                                                                                                                                 |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `command`  | `'apply' \| 'create' \| 'list'` | Baked in by inference.                                                                                                                |
| `database` | `string`                        | The D1 `database_name`. Baked in by inference.                                                                                        |
| `remote`   | `boolean` (default `false`)     | `false` → `--local`, `true` → `--remote`. The executor **always passes one explicitly** (wrangler requires it). Ignored for `create`. |
| `env`      | `string` (optional)             | `--env <env>` for Cloudflare environments.                                                                                            |
| `message`  | `string`                        | **Required when `command: 'create'`** (the migration message). Fail loud if missing.                                                  |

Built commands:

- `apply` → `wrangler d1 migrations apply <database> (--local|--remote) [--env <env>]`
- `create` → `wrangler d1 migrations create <database> <message>`
- `list` → `wrangler d1 migrations list <database> (--local|--remote) [--env <env>]`

#### `@naxodev/nx-cloudflare:secret` (`src/executors/secret`)

Wraps `wrangler secret <command>`.

Schema options:

| Option    | Type                                    | Notes                                                                   |
| --------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `command` | `'put' \| 'bulk' \| 'list' \| 'delete'` | Baked in by inference.                                                  |
| `name`    | `string`                                | **Required for `put`/`delete`** (the secret KEY). Fail loud if missing. |
| `file`    | `string`                                | **Required for `bulk`** (JSON file path). Fail loud if missing.         |
| `env`     | `string` (optional)                     | `--env <env>`.                                                          |

Built commands:

- `put` → `wrangler secret put <name> [--env <env>]`
- `bulk` → `wrangler secret bulk <file> [--env <env>]`
- `list` → `wrangler secret list [--env <env>]`
- `delete` → `wrangler secret delete <name> [--env <env>]`

**`secret put` is interactive** — wrangler prompts for the value on stdin and never accepts it as
an argument (by design, for security). The executor therefore **inherits stdio** so the prompt
works through `nx`. This is precisely why the executor approach lets us include `put`/`delete`
cleanly where a non-interactive wrapper could not.

### Shared execution helper

Both executors shell out to wrangler from the project root via a shared
`src/utils/run-wrangler.ts` helper (sibling of the existing `run-wrangler-types.ts`). It builds an
argv array (never string-interpolates user values into a shell), runs wrangler with inherited
stdio, and returns `{ success: boolean }`. Executors return that object.

### Inference (`src/plugin.ts`)

`createNodesInternal` parses the wrangler config and extends `buildWorkerTargets`:

- **D1 targets** — for each entry in `d1_databases`, emit `d1-apply` / `d1-create` / `d1-list`,
  each pointing at the `d1` executor with `command` and `database` (= `database_name`) baked in.
  - **One D1 binding** → bare target names (`d1-apply`, `d1-create`, `d1-list`).
  - **Multiple D1 bindings** → suffix each by its `binding` name, e.g. `d1-apply-DB`,
    `d1-apply-ANALYTICS` (binding is SCREAMING_SNAKE and stable).
  - **No D1 binding** → no D1 targets.
- **Secret targets** — always emit `secret-put` / `secret-bulk` / `secret-list` /
  `secret-delete` (secrets never appear in `wrangler.jsonc`, so there is no config signal to gate
  on; like `deploy`/`tail`, they apply to every Worker).
- All target names are override-able via new `CloudflarePluginOptions` fields (e.g.
  `d1ApplyTargetName`, `secretPutTargetName`, …), matching the existing
  `serveTargetName`/`deployTargetName` pattern.

### Manifests

- New **`executors.json`** mapping `d1` and `secret` to their `executor` + `schema`.
- **`package.json` `exports`** entries for both executors' `./executors/<name>/executor` and
  `schema` (matching the detailed nx-cloudflare exports map).
- `@nx/nx-plugin-checks` lint validates these — run `nx lint nx-cloudflare` before considering the
  manifest changes done.

## Constraints

- **jsonc/json only for D1 inference.** Baking the database name in requires parsing the config to
  read `d1_databases`. There is no TOML parser in `plugin.ts` today (only a non-empty check), and
  the `binding` generator is likewise jsonc-only. TOML configs therefore get **no D1 targets**
  (documented). Secret targets are unaffected (not config-derived).
- **D1 commands require explicit `--local`/`--remote`.** The executor always passes one; `apply`
  defaults to **local** (safe), production opts in with `--remote` (`nx d1-apply my-worker --remote`).
- **No secret values via CLI args.** `put` uses the interactive prompt (inherited stdio); `bulk`
  reads a JSON file. The executor never accepts or logs a secret value.

## Testing

- **Executor unit tests** (`src/executors/d1`, `src/executors/secret`): mock the wrangler exec
  helper and assert the exact argv built for each `command` × option combination, including:
  - `create` without `message` fails loud; `put`/`delete` without `name` fail loud; `bulk` without
    `file` fails loud.
  - `--local` vs `--remote` selection for D1 `apply`/`list`.
  - `--env` threading.
- **`plugin.spec.ts`** cases:
  - D1 targets gated on `d1_databases` presence (absent → no D1 targets).
  - Single-D1 → bare names; multi-D1 → binding-suffixed names with the right `database` baked in.
  - Secret targets always present.
  - Target-name overrides honored.

Tests run via the repo's per-file `bun test` runner.

## Files touched

- `packages/nx-cloudflare/src/plugin.ts` — parse config, emit new targets, new options.
- `packages/nx-cloudflare/src/executors/d1/{executor.ts,schema.json,schema.d.ts,executor.spec.ts}` — new.
- `packages/nx-cloudflare/src/executors/secret/{executor.ts,schema.json,schema.d.ts,executor.spec.ts}` — new.
- `packages/nx-cloudflare/src/utils/run-wrangler.ts` — new shared exec helper.
- `packages/nx-cloudflare/executors.json` — new manifest.
- `packages/nx-cloudflare/package.json` — `exports` additions.
- `packages/nx-cloudflare/src/plugin.spec.ts` — inference tests.
- `packages/nx-cloudflare/README.md` + docs site — document the new targets and the jsonc-only /
  local-default caveats.
