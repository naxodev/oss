---
title: Lint Executor
description: Formats and lints a Go project
---

## Usage

```bash
nx lint my-go-app
```

## Options

| Option | Type     | Default  | Description                              |
| ------ | -------- | -------- | ---------------------------------------- |
| linter | string   | "go fmt" | The command to execute instead of go fmt |
| args   | string[] | -        | Extra args when linting the project      |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:lint",
  "cache": true,
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

### Using golangci-lint

```json
"@naxodev/gonx:lint": {
  "cache": true,
  "inputs": [
    "{projectRoot}/go.mod",
    "{projectRoot}/go.sum",
    "{projectRoot}/**/*.{go}"
  ],
  "options": {
    "linter": "golangci-lint run"
  }
},
```

## Notes

- The lint executor is cacheable
- You can customize the linting tool (for example, use gofmt or golangci-lint instead of go fmt)
- Uses the official Go tooling in the background
