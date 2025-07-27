---
title: Build Executor
description: Builds a Go project using the Go compiler
---

## Usage

```bash
nx build my-go-app
```

## Options

| Option     | Type     | Default             | Description                                                                 |
| ---------- | -------- | ------------------- | --------------------------------------------------------------------------- |
| main       | string   | -                   | Relative path from the project root to the main.go file defining the binary |
| compiler   | string   | "go"                | The Go compiler to use (possible values: 'go', 'tinygo')                    |
| outputPath | string   | dist/{project-root} | The output path of the resulting executable                                 |
| buildMode  | string   | -                   | Build mode to use                                                           |
| env        | object   | -                   | Environment variables to set when running the executor                      |
| flags      | string[] | -                   | Flags to pass to the go compiler                                            |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:build",
  "cache": true,
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"],
  "options": {
    "outputPath": "dist/{projectRoot}"
  },
  "outputs": ["{options.outputPath}"]
}
```

## Examples

### Build with default main.go

```bash
nx build my-go-app
```

### Build with custom main file

```bash
nx build my-go-app --main=cmd/server/main.go
```

This will build the application using the main.go file located at `cmd/server/main.go` relative to the project root.

## Notes

- The build executor is cacheable, so subsequent builds with the same inputs will be faster
- Uses the official Go compiler in the background by default but the compiler can be overridden to use `tinygo` or any other Go compiler
- When `main` option is specified, the build command runs from the directory containing the main.go file
- If no `main` option is provided, the build command will discover and build all main packages in the project
