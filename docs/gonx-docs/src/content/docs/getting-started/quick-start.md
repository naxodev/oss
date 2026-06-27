---
title: Quick start
description: Get up and running with gonx in under a minute.
---

import { Steps } from '@astrojs/starlight/components';

Create a Go application with Nx, then run, test, and build it using targets that
gonx infers from `go.mod`.

:::note
gonx is a fork of [@nx-go/nx-go](https://github.com/nx-go/nx-go), modernized for
Nx 23 with inferred tasks and a tree-sitter-based project graph.
:::

## Before you start

- **Node.js 22+** (an active LTS release; Node 24 is the latest) and an Nx 23.x workspace
- **Go** — a [stable release](https://go.dev/dl/) (1.18+ for multi-module
  workspaces)

gonx 3.x targets Nx 23.x:

| Nx version | gonx version |
| ---------- | ------------ |
| 23.x       | 3.x          |

## Steps

<Steps>
1. **Create a workspace with the gonx preset**
   ```bash
   npx create-nx-workspace go-workspace --preset=@naxodev/gonx
   ```
   This scaffolds an Nx workspace with gonx registered and a starter Go project.
   If you already have a workspace, install gonx into it instead:
   ```bash
   npx nx add @naxodev/gonx
   ```

2. **Create a Go application**

   ```bash
   cd go-workspace
   npx nx g @naxodev/gonx:application my-go-app
   ```

   The generator creates a Go project with a `package main` entry point. gonx
   detects the `go.mod` and infers `build`, `serve`, `test`, `lint`, `tidy`, and
   `generate` targets. Pass `--template` to choose `standard`, `cli`, or `tui`.
   See the [application generator guide](/guides/generators/application) for all
   options.

3. **Run the application**

   ```bash
   npx nx run my-go-app:serve
   ```

   The `serve` target runs `go run` from the project root. See the
   [serve executor guide](/guides/executors/serve).

4. **Test the project**

   ```bash
   npx nx run my-go-app:test
   ```

   The `test` target runs `go test`. See the
   [test executor guide](/guides/executors/test).

5. **Build the project**
   ```bash
   npx nx run my-go-app:build
   ```
   The `build` target compiles an executable. See the
   [build executor guide](/guides/executors/build).
   </Steps>

## Verify

List the projects Nx detected and the targets inferred for your application:

```bash
npx nx show projects
npx nx show project my-go-app
```

`nx show project` lists the `build`, `serve`, `test`, `lint`, `tidy`, and
`generate` targets with no `project.json` file. Run `npx nx run my-go-app:build` a
second time to confirm caching — the second run is served from the Nx cache.

## Next steps

- [Create your first Go project](/tutorials/first-go-project) — a full walkthrough with explanations
- [Install GoNx](/getting-started/installation) — add gonx to an existing workspace
- [Plugin options](/guides/generators/options) — customize target names and tags
- [Migrate to gonx 3.0.0](/community/migration) — coming from nx-go
