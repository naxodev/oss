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

## Limitations

- **No build tag support**: All `.go` files are parsed regardless of
  `//go:build` constraints. This may include platform-specific
  dependencies that wouldn't be compiled in practice. Cross-platform
  code with OS-specific files (e.g. `foo_linux.go` and `foo_windows.go`
  importing different sibling projects) will produce the **union** of
  edges across all build tags. This can introduce false dependency
  cycles between projects that are acyclic on any individual platform —
  worth checking if you see unexpected cycles in `nx graph`.

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
