# Serve Executor

Runs a Go application.

## Usage

```bash
nx serve my-go-app
```

## Options

| Option | Type     | Default | Description                                               |
| ------ | -------- | ------- | --------------------------------------------------------- |
| cmd    | string   | "go"    | Name of the go binary to use                              |
| args   | string[] | -       | Extra args when starting the app                          |
| env    | object   | -       | Environment variables to set when running the application |

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:serve",
  "options": {}
}
```

## Notes

- The serve executor helps during development with fast code execution
- Uses the official `go run` commands in the background, but it can be overridden to use any other command.
