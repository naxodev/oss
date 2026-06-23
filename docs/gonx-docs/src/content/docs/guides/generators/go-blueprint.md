---
title: Go Blueprint generator
description: Generates a Go application by wrapping the @melkeydev/go-blueprint CLI.
---

Generates a Go application by wrapping the `@melkeydev/go-blueprint` CLI, which is bundled with this package. Scaffolds a project from a selected web framework, database driver, and optional advanced features.

## Usage

```bash
nx g @naxodev/gonx:go-blueprint <directory>
```

## Options

| Option       | Type                                                                                       | Default    | Description                                                                            |
| ------------ | ------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------- |
| directory    | string                                                                                     | _required_ | Directory of the new application. Taken from the first positional argument.            |
| name         | string                                                                                     | -          | Name of the application. Must match `^[a-zA-Z][^:]*$`.                                 |
| tags         | string                                                                                     | -          | Tags to add to the project (used for linting).                                         |
| skipFormat   | boolean                                                                                    | `false`    | Skip formatting files.                                                                 |
| addGoDotWork | boolean                                                                                    | `false`    | Add this project to `go.work`.                                                         |
| framework    | `chi` \| `gin` \| `fiber` \| `gorilla/mux` \| `httprouter` \| `standard-library` \| `echo` | _required_ | Web framework.                                                                         |
| driver       | `mysql` \| `postgres` \| `sqlite` \| `mongo` \| `redis` \| `scylla` \| `none`              | _required_ | Database driver.                                                                       |
| git          | `commit` \| `stage` \| `skip`                                                              | _required_ | Git handling.                                                                          |
| feature      | array                                                                                      | -          | Advanced features: `react`, `htmx`, `githubaction`, `websocket`, `tailwind`, `docker`. |

## Notes

- The `@melkeydev/go-blueprint` binary is resolved from the bundled npm dependency; no separate installation is required.
- Runs the init generator first to register the inference plugin. Adds the project to `go.work` when `addGoDotWork` is set and a Go workspace is supported.
- Removes `.air.toml`, `README.md`, and `Makefile` from the generated output.
- The `react` feature embeds frontend code inside the Go project directory, which Nx's project graph does not detect as a separate project.
- Inferred targets for the resulting application: `build`, `serve`, `test`, `lint`, `tidy`, `generate`, `nx-release-publish`.

## Next steps

- [Application generator](/guides/generators/application)
- [Build executor](/guides/executors/build)
- [Serve executor](/guides/executors/serve)
