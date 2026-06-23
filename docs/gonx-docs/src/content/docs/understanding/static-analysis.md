---
title: How static analysis works
description: Why gonx uses tree-sitter to build the Nx project graph from Go source.
---

gonx builds the Nx project graph by parsing Go source files directly with
[tree-sitter](https://tree-sitter.github.io/). This approach does not require Go
to be installed, which means `nx graph` and affected-task detection work even in
environments without a Go toolchain.

## Why tree-sitter

A Go toolchain is not always available in every environment that runs Nx — CI
runners, remote caches, or containers may have Node but not Go. Parsing Go
source with tree-sitter lets gonx extract import statements and build the
project graph without invoking `go list` or any external process. The parser is
a WebAssembly binary loaded from the `web-tree-sitter` and `tree-sitter-go`
packages, so it runs anywhere Node runs.

## How the graph is built

The dependency detection runs in four stages:

1. **Module discovery** — gonx scans all Nx projects for `go.mod` files and
   extracts module paths and replace directives. Each `go.mod` defines a Go
   module; its module path is the key used to resolve imports.

2. **Import extraction** — `.go` files are parsed with tree-sitter to extract
   `import` statements. `vendor/` and `testdata/` directories are excluded.

3. **Dependency resolution** — imports are resolved to Nx projects using
   longest-prefix matching. For example, importing
   `github.com/myorg/shared/utils` resolves to the project whose `go.mod`
   declares `module github.com/myorg/shared`.

4. **Replace directives** — `replace` directives in `go.mod` are scoped
   per-project. A replace directive in one project's `go.mod` only affects that
   project's imports, matching Go's own module resolution semantics.

## Build constraints

gonx honors `//go:build` and legacy `// +build` constraints. The dependency
graph is computed against the host platform's `GOOS`/`GOARCH` — a file gated to
a different platform contributes no edges on the host.

Supported in the constraint expression:

- `//go:build` modern boolean form: `&&`, `||`, `!`, parentheses
- `// +build` legacy form (space-separated terms = OR, comma-separated within a
  term = AND, `!` per-term negation, multiple lines AND'd)
- `unix` pseudo-tag (matches Linux, Darwin, the BSDs, Solaris, AIX, and the
  full set Go ships in `internal/syslist.UnixOS`)
- `GOOS` values (`linux`, `darwin`, `windows`, …) and `GOARCH` values
  (`amd64`, `arm64`, `386`, …)
- User-defined tags, plus `cgo` and `go1.N` policy

Filename-based suffixes are also honored, matching Go's `go/build` algorithm:
`name_<GOOS>.go`, `name_<GOARCH>.go`, `name_<GOOS>_<GOARCH>.go`, and any of
those with a trailing `_test` before `.go`. Note that `unix` is recognized only
as an in-source build tag, **not** as a filename suffix — Go itself doesn't
treat `foo_unix.go` as unix-gated, and neither does gonx.

### Edge-case behavior

- `go1.X` version tags evaluate to `true` by default (no Go compiler is handy to
  consult; over-including is safer than under-including for graph purposes).
- The `cgo` pseudo-tag evaluates to `false` by default — static analysis never
  invokes cgo.
- A malformed constraint expression falls back to "include the file" rather than
  failing graph construction.

## Limitations

- **No cgo support**: the `import "C"` pseudo-import is filtered out.
- **No dynamic imports**: only static `import` statements are detected.

## Disabling dependency detection

To disable Go dependency detection entirely, set
`skipGoDependencyCheck: true` in the plugin options:

```json
{
  "plugins": [
    {
      "plugin": "@naxodev/gonx",
      "options": {
        "skipGoDependencyCheck": true
      }
    }
  ]
}
```

See the [plugin options reference](/guides/generators/options) for all
configuration options.

## Troubleshooting

### Dependencies not detected

1. Verify both projects have `go.mod` files.
2. Check that the module paths match the import statements.
3. Ensure the importing project has a `replace` directive pointing to the local
   project (required when not using `go.work`).

### Debugging

```bash
NX_VERBOSE_LOGGING=true nx graph
```

## Next steps

- [Plugin options](/guides/generators/options) — `skipGoDependencyCheck` and other settings
- [Quick start](/getting-started/quick-start) — see the project graph in action
- [Contributing](/community/contributing) — how to contribute to gonx
