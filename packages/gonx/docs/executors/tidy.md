# Tidy Executor

Ensures go.mod file matches the project's source code.

## Usage

```bash
nx tidy my-go-app
```

## Options

| Option  | Type    | Default | Description           |
| ------- | ------- | ------- | --------------------- |
| verbose | boolean | false   | Enable verbose output |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:tidy",
  "cache": true,
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"]
}
```

## Notes

- The tidy executor is cacheable
- Uses the official Go mod tidy command in the background
- Ensures that the go.mod file accurately reflects your project dependencies
