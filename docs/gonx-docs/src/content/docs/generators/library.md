---
title: Library Generator
description: Generates a Go library with a well-structured foundation
---

## Usage

```bash
nx g @naxodev/gonx:library my-go-lib
```

## Options

| Option     | Type    | Default    | Description                                |
| ---------- | ------- | ---------- | ------------------------------------------ |
| name       | string  | null       | Name of the Go library                     |
| directory  | string  | \*required | The directory of the new library           |
| tags       | string  | null       | Add tags to the library (used for linting) |
| skipFormat | boolean | false      | Skip formatting files                      |

## Examples

### Generate a library in the root

```bash
nx g @naxodev/gonx:library my-go-lib
```

### Generate a library in a specific directory

```bash
nx g @naxodev/gonx:library libs/my-go-lib
```

### Generate a library with tags

> [!NOTE]
> Tags will only work when the project was created with a project.json file

```bash
nx g @naxodev/gonx:library my-go-lib --tags="json yaml"
```

## Output

The generator creates a Go library with the following structure:

```
my-go-lib/
├── go.mod
├── go.sum
├── my-go-lib.go
└── my-go-lib.go_test.go
```

## Notes

- Unlike the original nx-go, gonx does not generate a project.json file
- Uses inferred tasks, so you can immediately use `nx build`, `nx test`, etc.
- Works with both single and multi-module Go workspace configurations
- Integrated with Nx release system for version management
