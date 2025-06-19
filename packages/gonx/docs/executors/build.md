# Build Executor

Builds a Go project using the Go compiler.

## Usage

```bash
nx build my-go-app
```

## Options

| Option     | Type     | Default             | Description                                              |
| ---------- | -------- | ------------------- | -------------------------------------------------------- |
| compiler   | string   | "go"                | The Go compiler to use (possible values: 'go', 'tinygo') |
| outputPath | string   | dist/{project-root} | The output path of the resulting executable              |
| buildMode  | string   | -                   | Build mode to use                                        |
| env        | object   | -                   | Environment variables to set when running the executor   |
| flags      | string[] | -                   | Flags to pass to the go compiler                         |

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

- The build executor is cacheable, so subsequent builds with the same inputs will be faster
- Uses the official Go compiler in the background by default but the compiler can be overridden to use `tinygo` or any other Go compiler.
