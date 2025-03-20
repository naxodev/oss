# Configuration Options

gonx provides several configuration options to customize your Go development experience within Nx.

## Workspace Configuration

By default, gonx sets up a multi-module Go workspace configuration, which provides better integration with Nx's dependency graph and caching features. However, you can convert to a single-module configuration if preferred:

```bash
nx g @naxodev/gonx:convert-to-one-mod
```

## Inferred Tasks

gonx leverages Nx's inferred tasks feature, which means you don't need to have project.json files for your Go projects. The following tasks are automatically available:

| Task    | Command           | Description                               |
| ------- | ----------------- | ----------------------------------------- |
| build   | `nx build <app>`  | Builds the Go application                 |
| serve   | `nx serve <app>`  | Runs the Go application                   |
| test    | `nx test <app>`   | Runs tests for the Go project             |
| lint    | `nx lint <app>`   | Formats and lints the Go project          |
| tidy    | `nx tidy <app>`   | Ensures go.mod matches the project source |
| publish | (with nx release) | Publishes the Go module to the registry   |

## Nx Release Integration

gonx integrates with Nx's release system, providing:

1. Version management for Go modules
2. Publishing to the Go registry
3. Semantic versioning support

To use this feature, you can run:

```bash
nx release
```

This will handle versioning and publishing your Go modules.

## Custom Task Configuration

If you want to override the default inferred task configuration, you can create a project.json file in your Go project directory with custom executor options. This gives you fine-grained control while still benefiting from gonx's integration with Nx.

Example project.json:

```json
{
  "name": "my-go-app",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "targets": {
    "build": {
      "executor": "@naxodev/gonx:build",
      "options": {
        "main": "my-go-app/cmd/my-go-app/main.go",
        "outputPath": "dist/apps/my-go-app",
        "env": {
          "GOOS": "linux",
          "GOARCH": "amd64"
        }
      }
    }
  }
}
```

Or if you want to stay project-less you can configure it in the `nx.json`

```json
{
  ...
  "targetDefaults": {
    ...
    "@naxodev/gonx:lint": {
      "cache": true,
      "inputs": ["{projectRoot}/go.mod", "{projectRoot}/go.sum", "{projectRoot}/**/*.{go}"],
      "options": {
        "linter": "golangci-lint run"
      }
    }
  }
}
```

## Environment Variables

You can configure environment variables for Go commands using the `env` option in the executor configuration:

```json
{
  "build": {
    "executor": "@naxodev/gonx:build",
    "options": {
      "main": "my-go-app/cmd/my-go-app/main.go",
      "env": {
        "GOOS": "linux",
        "GOARCH": "amd64"
      }
    }
  }
}
```

## Compiler Options

For the build executor, you can choose between the standard Go compiler and TinyGo using the `compiler` option:

```json
{
  "build": {
    "executor": "@naxodev/gonx:build",
    "options": {
      "main": "my-go-app/cmd/my-go-app/main.go",
      "compiler": "tinygo"
    }
  }
}
```

## Custom Linting

You can configure custom linting tools instead of the default `go fmt`:

```json
{
  "lint": {
    "executor": "@naxodev/gonx:lint",
    "options": {
      "linter": "golangci-lint",
      "args": ["run"]
    }
  }
}
```
