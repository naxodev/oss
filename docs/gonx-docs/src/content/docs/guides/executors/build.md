---
title: Build executor
description: Compiles a Go program into an executable using the go build command.
---

The build executor compiles a Go program into an executable using `go build`.

## Usage

```bash
nx build my-go-app
```

## Options

| Option     | Type                | Default | Description                                                                  |
| ---------- | ------------------- | ------- | ---------------------------------------------------------------------------- |
| main       | string              | -       | Relative path from the project root to the main.go file defining the binary. |
| compiler   | go \| tinygo \| gow | go      | The Go compiler to use.                                                      |
| outputPath | string              | -       | The output path of the resulting executable.                                 |
| buildMode  | string              | -       | The build mode to use.                                                       |
| env        | object              | -       | Environment variables to set when running the executor.                      |
| flags      | string[]            | -       | Flags to pass to the go compiler.                                            |

When `main` is set, the build runs from the directory containing that main.go file. When omitted, the build targets `./...` (all packages in the project tree).

## Inferred target

Inferred for projects containing a `main` package (applications). The plugin generates:

```json
{
  "executor": "@naxodev/gonx:build",
  "cache": true,
  "dependsOn": ["generate"],
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"],
  "options": {
    "outputPath": "dist/{projectRoot}/"
  },
  "outputs": ["{options.outputPath}"]
}
```

The default `outputPath` resolves to `dist/<projectRoot>/`. Override it via the `outputPath` option.

## Next steps

- [Serve executor](/guides/executors/serve)
- [Test executor](/guides/executors/test)
- [Plugin options](/guides/generators/options)
