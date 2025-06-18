# Serve Executor

Runs a Go application.

## Usage

```bash
nx serve my-go-app
```

## Options

| Option | Type     | Default | Description                                                |
| ------ | -------- | ------- | ---------------------------------------------------------- |
| main   | string   | -       | Path to the file containing the main() function (optional) |
| cmd    | string   | "go"    | Name of the go binary to use                               |
| args   | string[] | -       | Extra args when starting the app                           |
| env    | object   | -       | Environment variables to set when running the application  |

## Auto-discovery

If the `main` option is not specified, the executor will automatically search for `main.go` files in the project directory and its subdirectories. The first `main.go` file found will be used.

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:serve",
  "options": {}
}
```

## Notes

- Automatically discovers `main.go` files when no explicit main file is specified
- Works with nested `main.go` packages, not just at the root level
- The serve executor helps during development with fast code execution
- Uses the official Go commands in the background
