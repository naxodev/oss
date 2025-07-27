---
title: Generate Executor
description: Runs code generation using the `go generate` command
---

## Usage

```bash
nx run my-go-app:generate
```

> **Note**: Use `nx run <project>:generate` instead of `nx generate <project>` to avoid conflicts with Nx's native generator commands.

## Options

| Option | Type     | Default | Description                                            |
| ------ | -------- | ------- | ------------------------------------------------------ |
| env    | object   | -       | Environment variables to set when running the executor |
| flags  | string[] | -       | Flags to pass to the go generate command               |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:generate",
  "cache": true,
  "dependsOn": ["^generate"],
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

## Examples

### Basic code generation

```bash
nx run my-go-app:generate
```

### Generate with verbose output

```bash
nx run my-go-app:generate --flags=-v
```

### Generate with multiple flags

```bash
nx run my-go-app:generate --flags=-v --flags=-x
```

### Generate with custom environment variables

```bash
nx run my-go-app:generate --env.GOOS=linux --env.GOARCH=amd64
```

## Notes

- The generate executor is cacheable, so subsequent runs with the same inputs will be faster
- Uses the official `go generate` command in the background
- The generate executor automatically runs before build and test operations due to dependency configuration
- The command searches for `//go:generate` directives in all Go files within the project and its subdirectories
- Generated files should be committed to version control if they are needed for builds
- The executor runs `go generate ./...` to process all packages in the project tree
- **Important**: Always use `nx run <project>:generate` syntax to avoid conflicts with Nx's `nx generate` command for generators
