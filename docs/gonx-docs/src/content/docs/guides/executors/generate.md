---
title: Generate executor
description: Runs code generation using the go generate command.
---

The generate executor runs code generation using `go generate ./...`, processing all `//go:generate` directives in the project tree.

## Usage

```bash
nx run my-go-project:generate
```

Use `nx run <project>:generate` instead of `nx generate <project>` to avoid conflicts with Nx's native generator command.

## Options

| Option | Type     | Default | Description                                             |
| ------ | -------- | ------- | ------------------------------------------------------- |
| env    | object   | -       | Environment variables to set when running the executor. |
| flags  | string[] | -       | Flags to pass to the go generate command.               |

## Inferred target

Inferred for all Go projects (applications and libraries):

```json
{
  "executor": "@naxodev/gonx:generate",
  "cache": true,
  "dependsOn": ["^generate"],
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

The `^generate` dependency means generate targets run after upstream project generate targets complete.

## Next steps

- [Build executor](/guides/executors/build)
- [Test executor](/guides/executors/test)
- [Plugin options](/guides/generators/options)
