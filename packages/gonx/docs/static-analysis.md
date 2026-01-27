# Static Analysis Dependency Detection

## Overview

gonx supports two strategies for detecting dependencies between Go projects:

1. **go-runtime** (default): Uses `go list -m -json` command
2. **static-analysis**: Uses tree-sitter to parse Go source files directly

The static analysis strategy is useful when:

- Go is not installed (CI environments, frontend-only developers)
- You don't use `go.work` files
- You want faster dependency detection

## Configuration

In your `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "@naxodev/gonx",
      "options": {
        "dependencyStrategy": "static-analysis"
      }
    }
  ]
}
```

### Options

| Value             | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `go-runtime`      | (Default) Uses Go toolchain via `go list -m -json`    |
| `static-analysis` | Uses tree-sitter WASM parser, no Go required          |
| `auto`            | Tries go-runtime first, falls back to static-analysis |

The `auto` strategy is useful for mixed teams where some developers have Go
installed and others don't.

## How It Works

1. **Module Discovery**: Scans all Nx projects for `go.mod` files and extracts
   module paths and replace directives.

2. **Import Extraction**: Parses `.go` files using tree-sitter to extract import
   statements. Excludes `vendor/` and `testdata/` directories.

3. **Dependency Resolution**: Uses longest-prefix matching to resolve imports to
   Nx projects. For example, importing `github.com/myorg/shared/utils` resolves
   to the project containing `module github.com/myorg/shared`.

4. **Replace Directives**: Scoped per-project. A replace directive in one
   project's `go.mod` only affects that project's imports.

## Comparison with go-runtime

| Aspect           | go-runtime         | static-analysis     |
| ---------------- | ------------------ | ------------------- |
| Requires Go      | Yes                | No                  |
| Requires go.work | Yes                | No                  |
| Module discovery | `go list -m -json` | Parses go.mod files |
| Import parsing   | Regex              | Tree-sitter AST     |

## Limitations

Both strategies share these limitations:

- **No build tag support**: All `.go` files are parsed regardless of
  `//go:build` constraints. This may include platform-specific dependencies
  that wouldn't be compiled in practice.

- **No cgo support**: The `import "C"` pseudo-import is filtered out.

- **No dynamic imports**: Only static `import` statements are detected.

## Troubleshooting

### Dependencies not detected

1. Verify both projects have `go.mod` files
2. Check the module paths match the import statements
3. Ensure the importing project has a replace directive pointing to the local
   project (required when not using `go.work`)

### Debugging

```bash
NX_VERBOSE_LOGGING=true nx graph
```

## Migration from skipGoDependencyCheck

If you were using `skipGoDependencyCheck: true` because Go wasn't installed,
use `dependencyStrategy: 'static-analysis'` instead to get dependency detection
without requiring Go.
