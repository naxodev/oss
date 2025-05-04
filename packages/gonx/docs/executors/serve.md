# Serve Executor

Runs a Go application.

## Usage

```bash
nx serve my-go-app
```

## Options

| Option | Type     | Default | Description                                                |
| ------ | -------- | ------- | ---------------------------------------------------------- |
| main   | string   | -       | Path to the file containing the main() function (required) |
| cmd    | string   | "go"    | Name of the go binary to use                               |
| cwd    | string   | -       | Working directory from which to run the application        |
| args   | string[] | -       | Extra args when starting the app                           |
| env    | object   | -       | Environment variables to set when running the application  |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:serve",
  "options": {
    "main": "./..."
  }
}
```

## Notes

- Works with nested `main.go` packages, not just at the root level
- The serve executor helps during development with fast code execution
- Uses the official Go commands in the background
