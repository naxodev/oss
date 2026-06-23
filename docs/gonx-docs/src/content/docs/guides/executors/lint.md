---
title: Lint executor
description: Formats and lints a Go project.
---

The lint executor formats and lints a Go project. By default it runs `go fmt ./...`.

## Usage

```bash
nx lint my-go-project
```

## Options

| Option | Type     | Default | Description                                 |
| ------ | -------- | ------- | ------------------------------------------- |
| linter | string   | go fmt  | The command to execute instead of `go fmt`. |
| args   | string[] | -       | Extra args passed to the linter.            |

When `linter` is set, the executor runs that command with `args` and `./...` appended, bypassing `go fmt`.

## Inferred target

Inferred for all Go projects (applications and libraries):

```json
{
  "executor": "@naxodev/gonx:lint",
  "cache": true,
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

## Next steps

- [Test executor](/guides/executors/test)
- [Tidy executor](/guides/executors/tidy)
- [Plugin options](/guides/generators/options)
