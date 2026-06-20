---
title: Install GoNx
description: How to install and configure @naxodev/gonx in your workspace.
---

import { Steps } from '@astrojs/starlight/components';

How to install `@naxodev/gonx` in an existing Nx workspace and register the
inference plugin.

## Before you start

- An **Nx 23.x** workspace (or later)
- **Node.js 22+** (an active LTS release; Node 24 is the latest)
- **Go** — a [stable release](https://go.dev/dl/) (1.18+ for multi-module
  workspaces)

Don't have a workspace yet? Create one with the gonx preset and skip to step 3:

```bash
npx create-nx-workspace my-org --preset=@naxodev/gonx
```

## Steps

<Steps>
1. **Install the package**

```bash
npm install @naxodev/gonx --save-dev
```

Or with Nx's built-in installer, which also runs any migrations:

```bash
npx nx add @naxodev/gonx
```

2. **Register the inference plugin in `nx.json`**

   Add `@naxodev/gonx` to the `plugins` array:

   ```json
   {
     "plugins": ["@naxodev/gonx"]
   }
   ```

   The plugin infers Nx projects from every `go.mod` matched by `**/go.mod`.
   No per-project `project.json` is needed.

3. **Verify the plugin is loaded**

   ```bash
   npx nx show projects
   ```

   Every directory containing a `go.mod` should appear as an Nx project. If you
   used the preset, your starter Go project will be listed.
   </Steps>

## Configuration

To customize inferred target names or disable dependency detection, use the
object form with `options`:

```json
{
  "plugins": [
    {
      "plugin": "@naxodev/gonx",
      "options": {
        "buildTargetName": "build",
        "testTargetName": "test",
        "skipGoDependencyCheck": false
      }
    }
  ]
}
```

See the [plugin options reference](/guides/generators/options) for every
available option.

## Next steps

- [Quick start](/getting-started/quick-start) — create, run, test, and build a Go app
- [Create your first Go project](/tutorials/first-go-project) — a full tutorial walkthrough
- [Application generator](/guides/generators/application) — scaffold a Go application
- [Migrate to gonx 3.0.0](/community/migration) — coming from nx-go
