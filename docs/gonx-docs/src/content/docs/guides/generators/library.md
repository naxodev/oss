---
title: Library generator
description: Generates a Go library and registers it as an Nx project through the gonx inference plugin.
---

Generates a Go library under the given directory and registers it as an Nx project through the gonx inference plugin. Aliased as `lib`.

## Usage

```bash
nx g @naxodev/gonx:library <directory>
```

## Options

| Option     | Type    | Default    | Description                                                             |
| ---------- | ------- | ---------- | ----------------------------------------------------------------------- |
| directory  | string  | _required_ | Directory of the new library. Taken from the first positional argument. |
| name       | string  | -          | Name of the library. Must match `^[a-zA-Z][^:]*$`.                      |
| tags       | string  | -          | Tags to add to the library (used for linting).                          |
| skipFormat | boolean | `false`    | Skip formatting files.                                                  |

## Notes

- Runs the init generator first to register the inference plugin in `nx.json`.
- Always creates a `go.mod` for the project. Adds the project to `go.work` when a Go workspace is present.
- Inferred targets for libraries: `test`, `lint`, `tidy`, `generate`, `nx-release-publish`. Libraries do not infer `build` or `serve`.

## Next steps

- [Application generator](/guides/generators/application)
- [Test executor](/guides/executors/test)
- [Lint executor](/guides/executors/lint)
