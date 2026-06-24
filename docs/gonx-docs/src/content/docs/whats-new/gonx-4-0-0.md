---
title: gonx 4.0.0
description: gonx 4.0.0 moves to Nx 23 and ships a more reliable tree-sitter project graph.
---

gonx 4.0.0 is the Nx 23 release. It brings the plugin in line with the latest Nx
major and hardens the tree-sitter project graph so `nx graph` and affected-task
detection stay correct across more workspaces. This is a major version because it
requires Nx 23 — but for most workspaces the upgrade is a migration command and a
rebuild.

## Now on Nx 23

gonx 4.0.0 targets **Nx 23**. The `@naxodev/gonx` migration bumps `nx` and
`@nx/devkit` to `^23.0.0`, so a single `nx migrate` brings your workspace and the
plugin forward together:

```bash
npx nx migrate latest
npx nx migrate --run-migrations
```

Everything you already rely on — inferred `build`, `serve`, `test`, `lint`,
`tidy`, and `generate` targets from each `go.mod`, plus the Go Blueprint and
application/library generators — works unchanged on Nx 23.

## A more reliable project graph

gonx builds the Nx project graph by parsing Go source with
[tree-sitter](https://tree-sitter.github.io/) instead of shelling out to the Go
toolchain, so `nx graph` works even on CI runners and containers that have Node
but not Go. 4.0.0 makes that graph more trustworthy:

- **Build constraints are honored.** gonx evaluates `//go:build` and legacy
  `// +build` tags against the host `GOOS`/`GOARCH`, so a file gated to another
  platform contributes no edges on the host — matching what `go build` actually
  compiles.
- **Hardened WebAssembly loading.** The `web-tree-sitter` / `tree-sitter-go`
  WASM parser now loads more robustly across environments, removing a class of
  graph-computation failures.
- **Per-project `replace` directives.** `replace` directives are scoped to the
  module that declares them, matching Go's own resolution semantics.

See [how static analysis works](/understanding/static-analysis) for the full
picture.

## Correct releases for release groups

`nx release` now resolves the current version correctly when a Go module is part
of an Nx **release group**, so versioning and the `nx-release-publish` executor
publish the right version. See the
[nx-release-publish guide](/guides/executors/nx-release-publish).

## Breaking changes

- **Nx 23 is required.** gonx 4.0.0 does not support older Nx majors. Run
  `nx migrate` before upgrading.

## Upgrade

Follow the [migration guide](/community/migration) for the full, step-by-step
upgrade — including removing hand-written Go targets and reviewing your
`go.work` setup. The short version:

```bash
npx nx add @naxodev/gonx
npx nx migrate --run-migrations
```

Then confirm your Go projects and their inferred targets still resolve:

```bash
npx nx show projects
npx nx show project apps/my-go-app
```
