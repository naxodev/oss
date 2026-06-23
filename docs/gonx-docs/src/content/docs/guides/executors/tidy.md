---
title: Tidy executor
description: Runs go mod tidy to sync go.mod with the project source code.
---

The tidy executor runs `go mod tidy` to ensure the go.mod file matches the project source code.

## Usage

```bash
nx tidy my-go-project
```

## Options

| Option | Type     | Default | Description                         |
| ------ | -------- | ------- | ----------------------------------- |
| args   | string[] | -       | Extra args passed to `go mod tidy`. |

## Inferred target

Inferred for all Go projects (applications and libraries):

```json
{
  "executor": "@naxodev/gonx:tidy",
  "cache": true,
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

## Next steps

- [Lint executor](/guides/executors/lint)
- [Plugin options](/guides/generators/options)
