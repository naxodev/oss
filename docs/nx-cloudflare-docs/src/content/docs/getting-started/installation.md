---
title: Install Nx Cloudflare
description: How to install and configure @naxodev/nx-cloudflare in your workspace.
---

import { Steps } from '@astrojs/starlight/components';

## Prerequisites

- **Node.js 22 or later** — an active LTS release (Node 24 is the latest). Required by Nx and Wrangler.
- An existing Nx workspace. If you don't have one, create it with
  `bunx create-nx-workspace@latest`.
- A package manager: **bun**, npm, yarn, or pnpm. Examples below use `bunx`.

## Steps

<Steps>

1. **Add the plugin**

   The recommended way is `nx add`, which installs the package and runs the
   [`init` generator](/guides/generators-init) to set up workspace-level
   dependencies and register the inference plugin:

   ```bash
   bunx nx add @naxodev/nx-cloudflare
   ```

   This installs Wrangler v4, `@cloudflare/workers-types`, and Vitest as
   devDependencies, and adds `@naxodev/nx-cloudflare/plugin` to the `plugins`
   array in `nx.json` so Worker targets are inferred automatically.

2. **(Alternative) Install manually**

   If you prefer to control setup yourself, install the package and Wrangler
   separately, then register the plugin in `nx.json`:

   ```bash
   bun add -D @naxodev/nx-cloudflare wrangler
   ```

   Then add the plugin to `nx.json`:

   ```json title="nx.json"
   {
     "plugins": ["@naxodev/nx-cloudflare/plugin"]
   }
   ```

   See [Plugin options](/understanding/plugin-options) for the object form if
   you need to customize inferred target names.

3. **Verify the plugin is registered**

   Confirm Nx recognizes the plugin by refreshing the project graph and
   inspecting a Worker project (once you have one):

   ```bash
   bunx nx reset
   bunx nx show project <my-worker>
   ```

   The output should list `serve`, `deploy`, `typegen`, `version-upload`, and
   `tail` targets. If you don't have a Worker yet, the
   [Quick start](/getting-started/quick-start) walks through generating one.

</Steps>

## Next steps

- [Quick start](/getting-started/quick-start) — create, serve, and deploy your
  first Worker.
- [application generator](/guides/generators-application) — scaffold a Worker
  application with C3.
- [Plugin options](/understanding/plugin-options) — customize inferred target
  names.
