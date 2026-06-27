---
title: Create your first Go project
description: How to create, run, test, and build a Go project with Nx and gonx.
---

import { Steps } from '@astrojs/starlight/components';

In this tutorial we'll create a Go application with Nx, then run, test, and build
it using targets that gonx infers from `go.mod`. Along the way we'll see how Nx
caching and the project graph work with Go projects.

## Before we start

We need:

- **Node.js 20+** and an **Nx 23.x** workspace
- **Go** — a [stable release](https://go.dev/dl/) (1.18+ for multi-module
  workspaces)

gonx 3.x targets Nx 23.x:

| Nx version | gonx version |
| ---------- | ------------ |
| 23.x       | 3.x          |

:::note
gonx is a fork of [@nx-go/nx-go](https://github.com/nx-go/nx-go), modernized for
Nx 23 with inferred tasks and a tree-sitter-based project graph.
:::

## Steps

<Steps>
1. **Create a workspace with the gonx preset**

We'll start by creating a fresh Nx workspace with gonx pre-configured:

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

This scaffolds an Nx workspace with gonx registered in `nx.json` and a
starter Go project. If you already have a workspace, install gonx into it
instead:

```bash
npx nx add @naxodev/gonx
```

See [install gonx](/getting-started/installation) for details.

2. **Create a Go application**

   Now we'll generate a Go application:

   ```bash
   cd go-workspace
   npx nx g @naxodev/gonx:application my-go-app
   ```

   The generator creates a Go project with a `package main` entry point and a
   `go.mod` file. gonx detects the `go.mod` and automatically infers `build`,
   `serve`, `test`, `lint`, `tidy`, and `generate` targets — no `project.json`
   needed. We can pass `--template` to choose `standard`, `cli`, or `tui`. See
   the [application generator guide](/guides/generators/application) for all
   options.

3. **Run the application**

   Let's run it:

   ```bash
   npx nx run my-go-app:serve
   ```

   The `serve` target runs `go run` from the project root. It's a continuous
   target, so it stays running until we stop it. See the
   [serve executor guide](/guides/executors/serve).

4. **Test the project**

   We can run the project's tests with:

   ```bash
   npx nx run my-go-app:test
   ```

   The `test` target runs `go test ./...`. Because the target is cached, running
   it again with no source changes will return instantly from the Nx cache. See
   the [test executor guide](/guides/executors/test).

5. **Build the project**

   Finally, let's build an executable:

   ```bash
   npx nx run my-go-app:build
   ```

   The `build` target compiles a binary and outputs it to
   `dist/<projectRoot>/`. See the
   [build executor guide](/guides/executors/build).
   </Steps>

## Verify

Let's confirm Nx detected our project and inferred the right targets:

```bash
npx nx show projects
npx nx show project my-go-app
```

`nx show project` lists the `build`, `serve`, `test`, `lint`, `tidy`, and
`generate` targets — all inferred, with no `project.json` file. Run
`npx nx run my-go-app:build` a second time to see Nx caching in action: the second
run is served from the cache and completes almost instantly.

## Explore the project graph

gonx builds the Nx project graph by parsing Go imports with tree-sitter. Let's
visualize the dependencies:

```bash
npx nx graph
```

This opens the Nx project graph UI in your browser. If we add a library and
import it from our application, the graph will show the dependency edge — even
without `go.work`. See [how static analysis works](/understanding/static-analysis)
to learn how gonx resolves imports to Nx projects.

## Next steps

- [Application generator](/guides/generators/application) — all options including templates and tags
- [Library generator](/guides/generators/library) — scaffold a reusable Go package
- [Plugin options](/guides/generators/options) — customize target names and tags
- [How static analysis works](/understanding/static-analysis) — the tree-sitter project graph
- [Migrate to gonx 3.0.0](/community/migration) — coming from nx-go
