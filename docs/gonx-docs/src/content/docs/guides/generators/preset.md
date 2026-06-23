---
title: Preset generator
description: Preset used by create-nx-workspace to scaffold a new Nx workspace with gonx pre-configured.
---

Preset used by `create-nx-workspace` to scaffold a new Nx workspace with gonx pre-configured. Delegates to the application, library, or go-blueprint generator based on the selected `type`.

## Usage

```bash
npx create-nx-workspace <workspace> --preset=@naxodev/gonx
```

## Options

| Option       | Type                                    | Default    | Description                                                             |
| ------------ | --------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| type         | `binary` \| `library` \| `go-blueprint` | `binary`   | Template type to generate. Required.                                    |
| directory    | string                                  | _required_ | Directory of the new project. Taken from the first positional argument. |
| name         | string                                  | -          | Name of the project. Must match `^[a-zA-Z][^:]*$`.                      |
| tags         | string                                  | -          | Tags to add to the project (used for linting).                          |
| skipFormat   | boolean                                 | `false`    | Skip formatting files.                                                  |
| addGoDotWork | boolean                                 | `false`    | Add a `go.work` file to the project.                                    |

### go-blueprint options

When `type` is `go-blueprint`, the following options are also required:

| Option    | Type                                                                                       | Default    | Description                                                                            |
| --------- | ------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------- |
| framework | `chi` \| `gin` \| `fiber` \| `gorilla/mux` \| `httprouter` \| `standard-library` \| `echo` | _required_ | Web framework.                                                                         |
| driver    | `mysql` \| `postgres` \| `sqlite` \| `mongo` \| `redis` \| `scylla` \| `none`              | _required_ | Database driver.                                                                       |
| git       | `commit` \| `stage` \| `skip`                                                              | _required_ | Git handling.                                                                          |
| feature   | array                                                                                      | -          | Advanced features: `react`, `htmx`, `githubaction`, `websocket`, `tailwind`, `docker`. |

## Notes

- `type=binary` delegates to the application generator; `type=library` delegates to the library generator; `type=go-blueprint` delegates to the go-blueprint generator.
- When invoked programmatically without go-blueprint values, the preset applies `framework=gin`, `driver=none`, `git=skip`, `feature=[]`.

## Next steps

- [Application generator](/guides/generators/application)
- [Library generator](/guides/generators/library)
- [Go Blueprint generator](/guides/generators/go-blueprint)
