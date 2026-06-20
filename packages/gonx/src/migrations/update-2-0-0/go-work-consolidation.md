# gonx 2.0.0 — go.work consolidation and executor changes

`@naxodev/gonx` 2.0.0 changed several defaults and removed executor options.
gonx infers `build`/`serve`/`test` targets from your Go projects
(`createNodesV2`), so most workspaces need **no config changes** — the new
behavior is baked into the inference plugin. This prompt only matters if you
upgraded from gonx **1.x** and hand-wrote gonx targets or relied on the old
`go.work`/`main.go` defaults.

## What changed

- **`init` no longer creates a `go.work` file by default** (#76). The build and
  serve executors now run from the project root and work **without** a `go.work`
  (#78). A workspace-wide `go.work` is optional, not required.
- **The `convert-to-one-mod` generator was removed** (#76). There is no
  drop-in replacement; consolidating multiple modules into one is now a manual
  Go operation.
- **`main.go` is no longer a special build/run target** (#79). The main package
  is detected via static analysis (`package main` + `func main()`), so the
  `main` executor option was removed from the `build` and `serve` schemas.
- **The `cwd` serve option was removed** and the binary option gained `gow`
  alongside `go`/`tinygo` (#78).

## What to do

1. **Remove stranded executor options.** If any `project.json` (or
   `targetDefaults` in `nx.json`) hand-writes a gonx `build`/`serve` target,
   delete now-invalid `options.main` and `options.cwd` — they are no longer in
   the schema and will be ignored. Prefer deleting the hand-written target
   entirely and letting the inference plugin provide it.
2. **Drop reliance on a generated `go.work`.** If your setup assumed `init`
   produced `go.work`, confirm builds still pass without it. Keep a `go.work`
   only if you intentionally use a multi-module workspace; it is no longer
   created or required by gonx.
3. **Replace `convert-to-one-mod` usage.** If a script or doc invoked
   `nx g @naxodev/gonx:convert-to-one-mod`, remove it and perform any
   module consolidation manually with standard Go tooling.

## Verify

Run `nx show project <name>` on a Go project and confirm `build`/`serve`
resolve from the `@naxodev/gonx` inference plugin with no leftover `main`/`cwd`
options, then run `nx build <name>` to confirm it passes without `go.work`.
