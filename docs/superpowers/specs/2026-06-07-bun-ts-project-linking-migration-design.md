# Migration: pnpm + integrated Nx → bun + TypeScript project linking

**Status:** Approved (design)
**Date:** 2026-06-07
**Reference:** `../maelstrom` (`/Users/nachovazquez/work/1-projects/maelstrom-co/maelstrom`) and a fresh `create-nx-workspace@latest --preset=ts --packageManager=bun` probe.

## Goal

Migrate `@naxodev/oss` from a pnpm-installed, **integrated** Nx monorepo (linking via
`tsconfig.base.json` `paths`) to a **bun**-installed, **TypeScript-project-linking** Nx
monorepo (bun workspaces + project references + the `@nx/js/typescript` inference plugin),
with shared dependency versions centralized in a **bun catalog**. Nx stays.

This matches maelstrom's shape and the canonical layout that Nx's own
`@nx/plugin:plugin` generator produces in a `--preset=ts` workspace.

## Non-goals

- Removing Nx, Nx Cloud, or the conventional-commits release model.
- Changing the two plugins' **published** layout (`main: ./src/index.js`, the deep
  `src/...` exports map, `generators.json`/`executors.json` factory paths). See
  "Right-sizing decision" below.
- Restructuring plugin source, generators, or executors beyond what linking requires.
- Migrating the Astro docs site beyond the package-manager/command swap.

## Current state (verified)

- **No** `pnpm-workspace.yaml` and **no** root `workspaces` field — Nx alone links the
  three libs via `tsconfig.base.json` `paths`. bun does not currently see the workspace
  packages.
- Published packages are **CommonJS Nx plugins**:
  - `@naxodev/gonx` — `"type":"commonjs"`, `main: ./src/index.js`, runtime deps incl.
    `web-tree-sitter` + `tree-sitter-go` (wasm loaded from `node_modules` at runtime via
    `require.resolve('tree-sitter-go/package.json')`, **not bundled**).
  - `@naxodev/nx-cloudflare` — same CJS shape plus a **deep exports map** exposing
    `./plugin`, `./src/generators/*/generator`, `./src/executors/*/executor`, schema
    entry points.
  - Both build with `@nx/js:tsc` → `dist/packages/<name>`, asset globs copying
    `**/!(*.ts)` (schema.json), `*.md`, `generators.json`, `executors.json`.
  - Published to **npm with provenance**, **independent** per-project release, tag
    pattern `{projectName}@v{version}`; publish is triggered by **publishing a GitHub
    Release** (`.github/workflows/release.yml` parses the project from the tag and runs
    `nx release publish`, `packageRoot: dist/{projectRoot}`).
- Non-published projects (`e2e-utils`, `gonx-e2e`, `nx-cloudflare-e2e`, `gonx-docs`) use
  `project.json`; none has a `package.json`.
- **Only real in-repo TS cross-import:** `@naxodev/e2e-utils`, consumed by both e2e
  suites. The two plugins are leaf nodes (import `@nx/*` externals only).
- **Tests:** Jest (`@nx/jest`, ts-jest, `jest.preset.js`, root `jest.config.ts`).
  ~46 spec files: gonx 26, nx-cloudflare 14, e2e 6. `vitest.workspace.ts` exists but the
  real unit suites are Jest.

## Target state (from maelstrom + the `--preset=ts` probe)

- Root `package.json`: `"workspaces": ["packages/*"]`, a `"catalog": { ... }` block,
  `@nx/devkit` as a real dependency.
- `bun.lock` instead of `pnpm-lock.yaml`.
- `tsconfig.base.json`: `composite`, `declarationMap`, `emitDeclarationOnly` (overridden
  to `false` in plugin `tsconfig.lib.json`), `isolatedModules`, `customConditions:
["@naxodev/source"]`, lenient `moduleResolution` to minimize churn.
- Root solution `tsconfig.json` with `references` to every project; per-project
  `tsconfig.json` → `tsconfig.lib.json` + `tsconfig.spec.json`, all `composite`.
- `nx.json` `plugins`: `@nx/js/typescript` (`typecheck` + inferred `build`). Each
  publishable plugin keeps an **explicit `@nx/js:tsc` build** in its `package.json`
  `nx.targets` (the exact pattern Nx's generator emits), so JS + assets still ship.
- Each project carries its own `package.json`; deps reference `catalog:` /
  `workspace:*`.
- Tests run via `bun test` per project (`nx.targets.test` = `{ command: "bun test",
options: { cwd: "{projectRoot}" } }`).

## Right-sizing decision (approved)

Keep each plugin's **existing published layout**. The migration is **additive** for the
plugins: add `"@naxodev/source": "./src/index.ts"` to the `.` export (so in-repo
typecheck/linking resolves source), keep `main: ./src/index.js` and the deep `src/...`
exports/factory paths unchanged, keep the explicit `@nx/js:tsc` build emitting to
`dist/packages/<name>`. Rationale: the plugins are leaf nodes, so source-condition
linking is low-value here; full dist-based convergence would force regenerating every
generator/executor factory path and re-validating the entire tarball e2e for no
functional gain.

## Catalog + publish-safety

`catalog:` and `workspace:*` are bun/pnpm-only protocols; plain `npm publish` does not
rewrite them. We adopt **catalog broadly** (including published runtime deps) and resolve
them at publish time by porting maelstrom's `scripts/publish-packages.ts` substitution
logic (`substituteManifest` + `assertNoProtocolLiterals`), **adapted to our flow**:

- Operates on the **built dist manifest** (`dist/packages/<name>/package.json`) before
  `npm publish --provenance`, preserving independent per-project + GitHub-Release-triggered
  release (we do **not** adopt maelstrom's fixed/GitHub-Packages `release.ts`).
- `assertNoProtocolLiterals` runs as a guard so a stray `catalog:`/`workspace:` literal
  fails the publish loudly instead of shipping a broken tarball.
- Open implementation detail for the plan: whether the substitution runs inside
  `release.yml` as a pre-`nx release publish` step or replaces `nx release publish` with a
  small `npm publish` wrapper. Decided during Phase 4 against a real `npm pack` dry-run.

## Module-format / resolution risk

Plugins stay CJS (`"type":"commonjs"`). The fresh-scaffold base uses `module: nodenext`;
to avoid a cascade of "missing extension" errors in existing CJS source, the base keeps a
lenient `moduleResolution` (`bundler`) and each plugin's `tsconfig.lib.json` retains its
`module: commonjs` override. Validated in Phase 2 via `nx run-many -t typecheck build`.

## Execution phases (≤5 files/phase where practical; verify + approval gate between each)

### Phase 1 — Package manager + catalog

- Add `"workspaces": ["packages/*"]` and `"catalog": { ... }` to root `package.json`.
- Delete `pnpm-lock.yaml`; rewrite `.npmrc` for bun; run `bun install` → `bun.lock`.
- Swap `pnpm exec nx` → `bunx nx` across CI workflows, `CONTRIBUTING.md`, `nx.json`
  `preVersionCommand`, generator/e2e helper code, husky hooks.
- **Verify:** `bun install` clean; `bunx nx graph` / `bunx nx run-many -t lint` resolves
  all projects.

### Phase 2 — TS project linking

- Rewrite `tsconfig.base.json` (composite model, custom condition, drop global `paths`).
- Create root solution `tsconfig.json` with `references`.
- Per-project `tsconfig.json`/`tsconfig.lib.json`/`tsconfig.spec.json` → composite.
- Give `e2e-utils` a real `package.json` (`exports` + `@naxodev/source` condition) so the
  one real cross-import resolves; add `@naxodev/source` to each plugin's `.` export.
- `nx.json`: replace integrated plugins with `@nx/js/typescript`; keep explicit
  `@nx/js:tsc` build in each plugin `package.json`.
- **Verify:** `bunx nx run-many -t typecheck build` green; `dist/packages/<name>` still
  contains compiled `src/*.js`, schema.json, generators.json, executors.json.

### Phase 3 — Tests → `bun test`

- Port unit specs (gonx, then nx-cloudflare): `jest` globals → `bun:test`, `jest.fn`/
  `jest.mock` → `mock`/`mock.module`, reconcile snapshots/timers, verify `@nx/devkit`
  Tree utils run under bun.
- Port the 6 e2e specs; set each project `nx.targets.test`/`e2e` to `bun test`.
- Remove `jest.preset.js`, root `jest.config.ts`, `vitest.workspace.ts`, Jest/`@nx/jest`
  deps.
- **Verify:** per-project `bunx nx test <p>` green; full e2e installs the tarball from
  Verdaccio and passes.

### Phase 4 — Release / publish

- Port the catalog/`workspace:*` substitution + `assertNoProtocolLiterals` guard into the
  publish path (against the dist manifest).
- `npm pack` dry-run on both plugins: assert no `catalog:`/`workspace:` literals, valid
  `main`/`exports`, schema/generator assets present, provenance-compatible manifest.
- Update `CLAUDE.md` + `CONTRIBUTING.md` command references (pnpm→bun, Jest→bun test).
- **Verify:** dry-run publish for both plugins succeeds; e2e (real tarball) still green.

## Success criteria

- `bun install` produces `bun.lock`; no `pnpm-lock.yaml`, no `pnpm` references remain.
- Shared versions live once in the root `catalog`; projects reference `catalog:`.
- `bunx nx run-many -t typecheck build test` is green; project graph + affected detection
  work via project references.
- Both plugins still publish valid npm tarballs with provenance — no protocol literals,
  unchanged generator/executor factory resolution, e2e tarball install passes.
- `CLAUDE.md`/`CONTRIBUTING.md`/CI reflect bun + bun test.

## Risks

1. **`bun test` port (Phase 3)** — highest risk. Mock/snapshot/timer semantics differ
   from Jest; `@nx/devkit` Tree utils must run under bun. Mitigation: port one plugin
   first, gate on green before the second.
2. **Catalog literals leaking into a published tarball.** Mitigation: `assertNoProtocolLiterals`
   guard + `npm pack` dry-run in Phase 4.
3. **`moduleResolution` churn** from the composite base. Mitigation: lenient `bundler`
   resolution + per-plugin CJS override; gate Phase 2 on `typecheck`.
4. **gonx wasm packaging** — low; wasm resolves from `node_modules` at runtime, only
   requires `tree-sitter-go` as a real dep (already present). Confirm in e2e.
