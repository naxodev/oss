# Build Executor

Builds a Go project using the Go compiler.

## Usage

```bash
nx build my-go-app
```

## Options

| Option     | Type     | Default             | Description                                                |
| ---------- | -------- | ------------------- | ---------------------------------------------------------- |
| main       | string   | -                   | Path to the file containing the main() function (optional) |
| compiler   | string   | "go"                | The Go compiler to use (possible values: 'go', 'tinygo')   |
| outputPath | string   | dist/{project-root} | The output path of the resulting executable                |
| buildMode  | string   | -                   | Build mode to use                                          |
| env        | object   | -                   | Environment variables to set when running the executor     |
| flags      | string[] | -                   | Flags to pass to the go compiler                           |

## Auto-discovery

If the `main` option is not specified, the executor will automatically search for `main.go` files in the project directory and its subdirectories. The first `main.go` file found will be used.

## Default Inferred

```json
{
  "executor": "@naxodev/gonx:build",
  "cache": true,
  "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"],
  "options": {
    "outputPath": "dist/{projectRoot}"
  },
  "outputs": ["{options.outputPath}"]
}
```

## Notes

- Automatically discovers `main.go` files when no explicit main file is specified
- The build executor is cacheable, so subsequent builds with the same inputs will be faster
- Uses the official Go compiler in the background
- Works with nested `main.go` packages, not just at the root level
