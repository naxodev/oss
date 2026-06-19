# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`@naxodev/oss` is an Nx 23 monorepo (bun workspace, Node 22) that publishes two independent Nx plugins to npm:

- **`@naxodev/nx-cloudflare`** (`packages/nx-cloudflare`) — Nx plugin for Cloudflare Workers (generators, executors, and a `createNodesV2` inference plugin around Wrangler).
- **`@naxodev/gonx`** (`packages/gonx`) — Nx plugin for using Go in an Nx workspace (fork of nx-go, modernized). Includes a tree-sitter–based Go static-analysis graph.

Supporting (non-published) projects: `e2e-utils` (shared e2e helpers), `nx-cloudflare-e2e` / `gonx-e2e` (e2e suites), and `gonx-docs` (Astro Starlight docs site at `packages/docs/gonx-docs`).

**Workspace structure:** a **bun workspace** (`workspaces: ["packages/*"]`) using **TypeScript project linking** — a composite `tsconfig.base.json` (`module/moduleResolution: nodenext`, `customConditions: ["@naxodev/source"]`), a root solution `tsconfig.json` with project `references`, and the `@nx/js/typescript` inference plugin (managed by `nx sync`); there are no `tsconfig` `paths`. Shared dependency versions live in a single root `catalog` (referenced as `"catalog:"`); the two plugins' **published** runtime deps stay explicit (loose ranges). Tests run on `bun test` (see below).

## Commands

All Nx invocations use `bunx nx ...`. The package manager is **bun** (not npm/yarn/pnpm).

```bash
# Build a single plugin (outputs to dist/packages/<name>)
bunx nx build nx-cloudflare
bunx nx build gonx

# Lint / test a project
bunx nx lint gonx
bunx nx test nx-cloudflare

# Run only what's affected (this is what CI runs)
bunx nx affected -t lint test build

# Formatting (Prettier, via nx)
bunx nx format:check      # verify
bunx nx format:write      # fix

# e2e (spins up a local Verdaccio registry — see note below)
bunx nx e2e nx-cloudflare-e2e
bunx nx e2e gonx-e2e
```

### Running a single unit test

Unit tests run on **`bun test`** (native `bun:test`). The `test` target (in each plugin's `project.json`) runs `tools/scripts/bun-test.ts`, a per-file runner that executes each spec in its own bun process — bun evaluates every spec's top-level `mock.module` before running any test, so a single shared process leaks module mocks across files. Run a single file directly with bun:

```bash
# By file (run bun directly from the project dir)
cd packages/gonx && bun test src/graph/static-analysis/parse-go-mod.spec.ts
# By test name
cd packages/nx-cloudflare && bun test src/plugin.spec.ts -t "infers"
# Whole project via Nx (uses the per-file isolation runner)
bunx nx test gonx
```

Note: the `@naxodev/nx-cloudflare` package scaffolds **Vitest** configs into _generated_ user projects — don't confuse the scaffolded test setup with this repo's own `bun test` setup. The e2e suites also run via `bun test`, with a bun preload (`tools/scripts/e2e-bun-setup.ts`) replacing jest's globalSetup/teardown to manage the local Verdaccio registry.

## Architecture

### Plugin package layout (shared by both plugins)

Each plugin is an Nx `library` project built with `@nx/js:tsc`. The published shape is driven by three manifests at the package root:

- `generators.json` — maps generator names → `src/generators/<name>/generator.ts` + `schema.json`.
- `executors.json` — maps executor names → `src/executors/<name>/executor.ts` + `schema.json`.
- `package.json` `exports` — for nx-cloudflare, a detailed exports map exposes `./plugin`, per-generator/executor `schema`/`generator` entry points. When adding a generator/executor, update **both** the relevant `*.json` manifest **and** (for nx-cloudflare) the `exports` map.

`src/index.ts` is the programmatic public API. For gonx it exports the `NxPlugin` object (`createNodesV2` + `createDependencies`); for nx-cloudflare it re-exports the generators for composition by other plugins.

### Inference plugins (createNodes)

Both plugins infer Nx targets from project files rather than requiring hand-written `project.json` targets:

- **nx-cloudflare** (`src/plugin.ts`): detects Wrangler config and builds Worker lifecycle targets (`serve`/`deploy`/`typegen`/`version-upload`/`tail`) that shell out to the Wrangler CLI via `nx:run-commands`. Target names are configurable via `CloudflarePluginOptions`.
- **gonx** (`src/graph/`): `createNodesV2.ts` infers targets from Go projects; `create-dependencies.ts` builds the project graph from Go imports. The `src/graph/static-analysis/` module parses `go.mod`/`go.work` and Go source with **tree-sitter** (`web-tree-sitter` + `tree-sitter-go`) to resolve the local import graph. See `packages/gonx/docs/static-analysis.md`.

### Releases

Releases are **independent per project** (`nx.json` → `release.projects: ["gonx", "nx-cloudflare"]`), driven by Conventional Commits. Versioning/changelog/GitHub-release creation are handled by `nx release`. Publishing is triggered by **publishing a GitHub Release** whose tag follows `{projectName}@v{version}` (e.g. `gonx@v3.0.0`); `.github/workflows/release.yml` parses the project from the tag, builds it, and runs `nx release publish` with npm provenance. Prereleases (GitHub "prerelease" flag) publish under the `next` npm tag, otherwise `latest`.

Because releases are conventional-commit driven, commit messages and **PR titles matter** — squash-merge lands the PR title as the commit subject. Use Conventional Commits with the package scope, e.g. `feat(nx-cloudflare): ...`, `fix(gonx): ...`, `feat(nx-cloudflare)!: ...` for breaking changes.

### e2e tests

e2e suites (`*-e2e`) install the **published tarball** from a local Verdaccio registry into a freshly generated Nx workspace (`packages/e2e-utils/src/lib/create-test-project.ts` → real `create-nx-workspace` + install), so they exercise peerDependencies, the `exports` map, and migrations the way real consumers do — not a copied `dist` fixture.

The two e2e projects **share one Verdaccio instance** (same port/storage). `tools/scripts/start-local-registry.ts` coordinates ownership via per-pid lock files so parallel bun-test preload setups/teardowns (`tools/scripts/e2e-bun-setup.ts`) don't race. Consequently CI runs e2e **serially** (`--parallel=1`), and e2e is skipped on Windows.

## CI

`.github/workflows/ci.yml` runs on push to `main` and PRs across Ubuntu/macOS/Windows: `nx format:check`, then `nx affected -t lint test`, `nx affected -t build`, then `nx affected -t e2e --parallel=1` (non-Windows). Uses `nrwl/nx-set-shas` for affected detection and Nx Cloud for caching.

## Conventions

- Commit messages are validated by **commitlint** (`@commitlint/config-conventional`).
- ESLint enforces `@nx/enforce-module-boundaries` and `@nx/nx-plugin-checks` (validates `package.json`/`generators.json` for the plugins). Run lint before considering plugin manifest changes done.
- Projects are tagged `scope:public` / `type:plugin`.
