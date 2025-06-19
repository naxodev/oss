# Serve Executor

Runs a Go application.

## Usage

```bash
nx serve my-go-app
```

## Options

| Option | Type     | Default | Description                                                                 |
| ------ | -------- | ------- | --------------------------------------------------------------------------- |
| main   | string   | -       | Relative path from the project root to the main.go file defining the binary |
| cmd    | string   | "go"    | Name of the go binary to use                                                |
| args   | string[] | -       | Extra args when starting the app                                            |
| env    | object   | -       | Environment variables to set when running the application                   |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:serve",
  "options": {}
}
```

## Examples

### Serve with default main.go

```bash
nx serve my-go-app
```

### Serve with custom main file

```bash
nx serve my-go-app --main=cmd/server/main.go
```

This will run the application using the main.go file located at `cmd/server/main.go` relative to the project root.

### Serve with arguments

```bash
nx serve my-go-app --args="--port=8080,--debug"
```

## Notes

- Automatically discovers `main.go` files when no explicit main file is specified
- Uses the official `go run` commands in the background, but it can be overridden to use any other command
- When `main` option is specified, the serve command runs from the directory containing the main.go file
- If no `main` option is provided, the serve command will discover and run the main package in the project root
