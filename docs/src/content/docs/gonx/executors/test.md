---
title: Test Executor
description: Runs tests for a Go project
---


## Usage

```bash
nx test my-go-app
```

## Options

| Option       | Type    | Default | Description                                                      |
| ------------ | ------- | ------- | ---------------------------------------------------------------- |
| cover        | boolean | false   | Enable coverage analysis                                         |
| coverProfile | string  | -       | Write a coverage profile to the file after all tests have passed |
| race         | boolean | false   | Enable race detector                                             |
| run          | string  | -       | Run only tests matching this regular expression                  |
| verbose      | boolean | false   | Enable verbose test output                                       |
| count        | number  | -       | Run test N times                                                 |
| timeout      | string  | "10m"   | Test timeout duration (0 to disable)                             |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:test",
  "cache": true,
  "dependsOn": ["^build"],
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

## Notes

- The test executor is cacheable, so subsequent test runs with the same test code will be faster
- Uses the official Go test command in the background
- Supports all common Go test options
