---
title: Migrate to gonx 3.0.0
description: How to migrate from nx-go or upgrade to @naxodev/gonx 3.0.0.
---

import { Steps } from '@astrojs/starlight/components';

gonx 3.0.0 requires Nx 23 and infers Go targets from `go.mod` files instead of
generating `project.json` targets. Adapt your workspace with the steps below.

## Before you start

- **Nx 23.x** or later
- **Go** — a stable release (1.18+ for multi-module workspaces)
- A backup of your workspace

## Steps

<Steps>
1. **Upgrade to Nx 23**
   ```bash
   npx nx migrate latest
   npx nx migrate --run-migrations
   ```
   gonx 3.0.0 requires Nx 23.x. If you are already on 23, skip this step.

2. **Remove nx-go and install gonx**
   If migrating from [@nx-go/nx-go](https://github.com/nx-go/nx-go), uninstall it
   first:

   ```bash
   npm uninstall @nx-go/nx-go
   ```

   Then install gonx and apply its migrations:

   ```bash
   npx nx add @naxodev/gonx
   ```

   If you are upgrading from an earlier gonx release, `nx add` picks up the
   migration prompts automatically.

3. **Register the gonx plugin in `nx.json`**

   ```json
   {
     "plugins": ["@naxodev/gonx"]
   }
   ```

   Remove any nx-go plugin entry. gonx infers targets from `go.mod`, so no
   per-project config is needed.

4. **Delete hand-written Go targets**
   gonx infers `build`, `serve`, `test`, `lint`, `tidy`, and `generate` from each
   `go.mod`. The main package is auto-detected — a project with `package main`
   and `func main()` in `main.go`, or a `cmd/` directory, is treated as an
   application and gets `build` and `serve` targets. Remove `project.json` files
   that hand-write those targets:

   ```bash
   rm apps/my-go-app/project.json
   ```

   Keep `project.json` only for non-Go projects or custom overrides. gonx uses
   the full project root path as the project name (for example,
   `apps/my-go-app`), not just the final directory segment — this aligns with
   Go's release tagging convention (`projectRoot/vx.x.x`). Update any scripts or
   CI that reference short project names.

5. **Remove the `cwd` serve option and review `cmd`/`compiler` values**
   The `cwd` serve option no longer exists — serve runs from the project root.
   Delete `options.cwd` from any hand-written serve target. Because the main
   package is auto-detected, `options.main` is optional. The serve `cmd` and
   build `compiler` options now accept `gow` alongside `go` and `tinygo`. See
   the [serve executor guide](/guides/executors/serve) and
   [build executor guide](/guides/executors/build).

6. **Decide whether to keep `go.work`**
   gonx no longer creates a `go.work` file by default. Build and serve work
   without one. Keep an existing `go.work` only if you intentionally use a
   multi-module workspace. To opt in when initializing gonx:

   ```bash
   npx nx g @naxodev/gonx:init --addGoDotWork
   ```

7. **Remove `convert-to-one-mod` usage**
   The `convert-to-one-mod` generator was removed. Delete any script or doc that
   invokes `nx g @naxodev/gonx:convert-to-one-mod`. Consolidate modules manually
   with standard Go tooling.
   </Steps>

## Verify

Confirm Nx detects your Go projects and infers their targets:

```bash
npx nx show projects
npx nx show project apps/my-go-app
```

`nx show project` lists the inferred targets with no leftover `cwd` options.
Then build a project to confirm it works without `go.work`:

```bash
npx nx build apps/my-go-app
```

## Next steps

- [Plugin options](/guides/generators/options) — customize target names and tags
- [Create your first Go project](/tutorials/first-go-project) — walkthrough of generators and executors
- [nx-release-publish executor](/guides/executors/nx-release-publish) — publish Go modules
