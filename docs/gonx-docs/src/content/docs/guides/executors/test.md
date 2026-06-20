---
title: Test executor
description: Runs tests for a Go project using the go test command.
---

The test executor runs Go tests using `go test ./...`.

## Usage

```bash
nx test my-go-project
```

## Options

| Option       | Type    | Default | Description                                                                 |
| ------------ | ------- | ------- | --------------------------------------------------------------------------- |
| cover        | boolean | false   | Enable coverage analysis.                                                   |
| coverProfile | string  | -       | Write a coverage profile to the file after all tests have passed.           |
| race         | boolean | false   | Enable the race detector.                                                   |
| run          | string  | -       | Run only tests matching this regular expression.                            |
| verbose      | boolean | false   | Enable verbose test output.                                                 |
| count        | number  | -       | Run each test N times.                                                      |
| timeout      | string  | 10m     | Panic if a test binary runs longer than this duration. Set to 0 to disable. |

## Inferred target

Inferred for all Go projects (applications and libraries):

```json
{
  "executor": "@naxodev/gonx:test",
  "cache": true,
  "dependsOn": ["generate", "^build"],
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

The `^build` dependency means test targets run after upstream project build targets complete.

## Next steps

- [Build executor](/guides/executors/build)
- [Lint executor](/guides/executors/lint)
- [Plugin options](/guides/generators/options)
