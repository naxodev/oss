---
title: Serve executor
description: Runs a Go application using the go run command.
---

The serve executor runs a Go application using `go run`.

## Usage

```bash
nx serve my-go-app
```

## Options

| Option | Type                | Default | Description                                                                  |
| ------ | ------------------- | ------- | ---------------------------------------------------------------------------- |
| main   | string              | -       | Relative path from the project root to the main.go file defining the binary. |
| cmd    | go \| tinygo \| gow | go      | The binary to use for running the application.                               |
| args   | string[]            | -       | Extra args passed to the run command.                                        |
| env    | object              | -       | Environment variables to set when running the application.                   |

When `main` is set, the serve runs from the directory containing that main.go file. When omitted, the serve targets `./...`.

## Inferred target

Inferred for projects containing a `main` package (applications). The target is continuous and not cached:

```json
{
  "executor": "@naxodev/gonx:serve",
  "continuous": true,
  "options": {}
}
```

## Next steps

- [Build executor](/guides/executors/build)
- [Plugin options](/guides/generators/options)
