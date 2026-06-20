---
title: Application generator
description: Generates a Go application and registers it as an Nx project through the gonx inference plugin.
---

Generates a Go application under the given directory and registers it as an Nx project through the gonx inference plugin. Aliased as `app`.

## Usage

```bash
nx g @naxodev/gonx:application <directory>
```

## Options

| Option     | Type                         | Default    | Description                                                                 |
| ---------- | ---------------------------- | ---------- | --------------------------------------------------------------------------- |
| directory  | string                       | _required_ | Directory of the new application. Taken from the first positional argument. |
| name       | string                       | -          | Name of the application. Must match `^[a-zA-Z][^:]*$`.                      |
| template   | `standard` \| `cli` \| `tui` | `standard` | Application template to generate.                                           |
| tags       | string                       | -          | Tags to add to the application (used for linting).                          |
| skipFormat | boolean                      | `false`    | Skip formatting files.                                                      |

## Notes

- Runs the init generator first to register the inference plugin in `nx.json`.
- Creates a `go.mod` for the project unless the template already includes one. Adds the project to `go.work` when a Go workspace is present.
- Inferred targets for applications: `build`, `serve`, `test`, `lint`, `tidy`, `generate`, `nx-release-publish`. Application detection requires a `main.go` containing `package main` and `func main(`, or a `cmd/` directory.

## Next steps

- [Library generator](/guides/generators/library)
- [Build executor](/guides/executors/build)
- [Serve executor](/guides/executors/serve)
