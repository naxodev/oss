# Dependency detection (contributor notes)

> The user-facing explanation of this module lives on the docs site:
> [Static analysis](https://gonx.naxo.dev/understanding/static-analysis/). This
> page covers only what the site page deliberately omits — internals useful
> when hacking on the module.

`src/graph/static-analysis/` builds the Nx project graph from Go source using
tree-sitter, without requiring a Go toolchain. See the site page for the
pipeline overview, configuration (`skipGoDependencyCheck`), and end-user
troubleshooting.

## Module layout

| File                   | Role                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`             | Orchestrates the pipeline: `buildImportMap` → per-project `findGoFiles`/`extractImports` → `resolveImport`, then dedupes edges.                 |
| `build-import-map.ts`  | Scans all projects' `go.mod` files into a module-path → project map, plus per-project replace directives.                                       |
| `parse-go-mod.ts`      | Regex-based `go.mod` parser (module path, single-line and block `replace` directives).                                                          |
| `is-local-path.ts`     | Classifies a `replace` target as a local filesystem path vs. a module path.                                                                     |
| `find-go-files.ts`     | Recursively lists `.go` files, excluding `vendor/`, `testdata/`, and common build/output dirs.                                                  |
| `parser-init.ts`       | Singleton tree-sitter parser init; loads the `tree-sitter-go.wasm` binary via a dynamic `import('web-tree-sitter')`.                            |
| `extract-imports.ts`   | Parses a file with tree-sitter, applies build-constraint filtering (below), and returns its import paths (filters the `"C"` cgo pseudo-import). |
| `build-constraints.ts` | `//go:build` / `// +build` / filename-suffix evaluator — see below.                                                                             |
| `resolve-import.ts`    | Longest-prefix match of an import path against the module map, applying replace directives.                                                     |

## Internal `BuildContext` API

`build-constraints.ts` evaluates constraints against a `BuildContext`, not
just `GOOS`/`GOARCH`:

- `tags: ReadonlySet<string>` — arbitrary user-defined build tags to treat as
  satisfied.
- `cgoEnabled?: boolean` — gates the `cgo` pseudo-tag; defaults to `false`
  (static analysis never invokes cgo).
- `goVersion` (a `1.N` string) — gates `go1.N` tags on `ctx-minor >= tag-minor`;
  unset means every `go1.N` tag is satisfied (over-include).

None of these three fields are exposed as plugin options —
`getDefaultBuildContext()` (memoized per-process) is the only constructor used
by `extractImports`, and it derives `goos`/`goarch` from
`process.platform`/`process.arch` with an empty `tags` set and both optional
fields unset. They exist for callers that construct a `BuildContext` directly
(e.g. tests exercising cross-platform or tagged-build scenarios) — see
`build-constraints.spec.ts`.

## Debugging notes

- `shouldIncludeFile`/`evaluateGoBuild` take an optional `sourceLabel`; pass a
  file path to get `logger.warn` output for malformed expressions, unknown
  characters, or trailing tokens. `extractImports` passes the real file path;
  most unit tests omit it to keep output quiet.
- Each stage has its own spec file (`build-import-map.spec.ts`,
  `extract-imports.spec.ts`, etc.) — run a single one directly with
  `cd packages/gonx && bun test src/graph/static-analysis/<file>.spec.ts`
  rather than the full suite when iterating on one stage.
