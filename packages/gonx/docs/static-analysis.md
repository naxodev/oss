# Dependency Detection

## Overview

gonx detects dependencies between Go projects using tree-sitter to
parse Go source files directly. This approach does not require Go to
be installed.

## How It Works

1. **Module Discovery**: Scans all Nx projects for `go.mod` files and
   extracts module paths and replace directives.

2. **Import Extraction**: Parses `.go` files using tree-sitter to
   extract import statements. Excludes `vendor/` and `testdata/`
   directories.

3. **Dependency Resolution**: Uses longest-prefix matching to resolve
   imports to Nx projects. For example, importing
   `github.com/myorg/shared/utils` resolves to the project containing
   `module github.com/myorg/shared`.

4. **Replace Directives**: Scoped per-project. A replace directive in
   one project's `go.mod` only affects that project's imports.

## Configuration

In your `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "@naxodev/gonx",
      "options": {}
    }
  ]
}
```

### Options

| Option                  | Type    | Default | Description                           |
| ----------------------- | ------- | ------- | ------------------------------------- |
| `skipGoDependencyCheck` | boolean | `false` | Disable dependency detection entirely |

## Build constraints

`//go:build` and legacy `// +build` constraints are honored. The dep
graph is computed against the host platform's GOOS/GOARCH — a file
gated to a different platform contributes no edges on the host.

Supported in the constraint expression:

- `//go:build` modern boolean form: `&&`, `||`, `!`, parens
- `// +build` legacy form (space-separated terms = OR, comma-separated
  within a term = AND, `!` per-term negation, multiple lines AND'd)
- `unix` pseudo-tag (matches Linux, Darwin, the BSDs, Solaris, AIX, and
  — note — Android, illumos, iOS, dragonfly, hurd; the full set Go ships
  in `internal/syslist.UnixOS`)
- GOOS values (`linux`, `darwin`, `windows`, …) and GOARCH values
  (`amd64`, `arm64`, `386`, …)
- User-defined tags via the `BuildContext.tags` set (internal API; a
  plugin-option surface is tracked in [#108](https://github.com/naxodev/oss/issues/108))

Filename-based suffixes are also honored, matching Go's `go/build`
algorithm:

- `name_<GOOS>.go` — gates on GOOS (e.g. `signal_linux.go`)
- `name_<GOARCH>.go` — gates on GOARCH (e.g. `sha1block_amd64.go`)
- `name_<GOOS>_<GOARCH>.go` — gates on both (e.g. `zsyscall_darwin_arm64.go`)
- Any of the above with a trailing `_test` before `.go`

Note that `unix` is recognized only as an in-source build tag, **not** as
a filename suffix — Go itself doesn't treat `foo_unix.go` as
unix-gated, and neither do we.

Behavior on edge cases:

- `go1.X` version tags evaluate to `true` (we have no Go compiler
  handy to consult; over-including is safer than under-including for
  graph purposes).
- The `cgo` pseudo-tag evaluates to `false` — static analysis never
  invokes cgo.
- A malformed expression falls back to "include the file" rather than
  failing graph construction.

## Limitations

- **No cgo support**: The `import "C"` pseudo-import is filtered out.

- **No dynamic imports**: Only static `import` statements are
  detected.

## Troubleshooting

### Dependencies not detected

1. Verify both projects have `go.mod` files
2. Check the module paths match the import statements
3. Ensure the importing project has a replace directive pointing to
   the local project (required when not using `go.work`)

### Debugging

```bash
NX_VERBOSE_LOGGING=true nx graph
```
