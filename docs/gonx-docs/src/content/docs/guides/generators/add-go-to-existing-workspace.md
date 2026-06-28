---
title: Add Go to an existing workspace
description: Register the gonx inference plugin in an existing Nx workspace and start adding Go projects.
---

Use the `init` generator to wire up the gonx inference plugin in an existing Nx workspace that was not created with the gonx preset.

## Step 1: Register the plugin

```bash
nx g @naxodev/gonx:init
```

This registers `@naxodev/gonx` under `plugins` in `nx.json`. Once registered, the plugin scans your workspace for `go.mod` files and infers Nx targets from them automatically.

### Options

| Option         | Type    | Default | Description                                                |
| -------------- | ------- | ------- | ---------------------------------------------------------- |
| `addGoDotWork` | boolean | `false` | Create a `go.work` file and register all Go modules in it. |

Pass `--addGoDotWork` if you want a Go workspace (`go.work`) at the repo root:

```bash
nx g @naxodev/gonx:init --addGoDotWork
```

## Step 2: Add Go projects

After `init`, add Go projects in one of two ways:

**Generate a new application or library:**

```bash
nx g @naxodev/gonx:application apps/my-api
nx g @naxodev/gonx:library libs/my-lib
```

**Or drop a `go.mod` into an existing directory.** The inference plugin picks it up automatically — no `project.json` required.

## Inferred targets

Once a `go.mod` is present in a directory, the plugin infers the following targets:

| Target               | Available on          | Description                   |
| -------------------- | --------------------- | ----------------------------- |
| `build`              | Applications only     | Compile the Go binary.        |
| `serve`              | Applications only     | Run the application locally.  |
| `test`               | Applications and libs | Run `go test`.                |
| `tidy`               | Applications and libs | Run `go mod tidy`.            |
| `lint`               | Applications and libs | Run the configured Go linter. |
| `generate`           | Applications and libs | Run `go generate`.            |
| `nx-release-publish` | Applications and libs | Publish via `nx release`.     |

Applications are detected by the presence of a `main.go` containing `package main` and `func main(`, or a `cmd/` directory.

## Verify

```bash
nx show project my-api
```

The project appears in the graph with its inferred targets — no `project.json` required.

## Next steps

- [Application generator](/guides/generators/application)
- [Library generator](/guides/generators/library)
- [Init generator reference](/guides/generators/init)
