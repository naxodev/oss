---
title: Create your first Cloudflare Worker
description: How to create, serve, and deploy a Cloudflare Worker with Nx.
---

import { Steps } from '@astrojs/starlight/components';

In this tutorial, we'll create a Cloudflare Worker, serve it locally, and deploy
it to Cloudflare — all from an Nx workspace.

## Before you start

- **Node.js 22 or later** — an active LTS release (Node 24 is the latest). Required by Nx and Wrangler.
- **A Cloudflare account** — needed for deployment. Sign up at
  [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
- **Wrangler v4** — installed automatically when we add the plugin.

## Compatibility

| Nx version | Plugin version |
| ---------- | -------------- |
| 17.x       | 1.x            |
| 18.x       | 2.x            |
| 19.x       | 3.x            |
| 20.x       | 4.x            |
| 21.x       | 5.x            |
| 22–23.x    | 6.x            |

Wrangler v4 is a peer dependency. The `init` generator installs it
automatically; if you add the plugin manually, install it with
`bun add -D wrangler`.

## Steps

<Steps>

1. **Add the plugin to our workspace**

   We'll use `nx add`, which installs the package and runs the
   [`init` generator](/guides/generators-init) to set up workspace-level dependencies
   and register the inference plugin in `nx.json`:

   ```bash
   bunx nx add @naxodev/nx-cloudflare
   ```

   This installs Wrangler v4, `@cloudflare/workers-types`, and Vitest as
   devDependencies, and adds `@naxodev/nx-cloudflare/plugin` to the `plugins`
   array in `nx.json` so Worker targets are inferred automatically.

2. **Generate a Worker**

   We'll scaffold a hello-world Worker using the
   [application generator](/guides/generators-application), which wraps Cloudflare's
   create-cloudflare (C3) CLI and makes the result Nx-ready:

   ```bash
   bunx nx g @naxodev/nx-cloudflare:application my-worker --type=hello-world
   ```

   The generator creates a `my-worker/` directory with a `wrangler.jsonc`
   config, a `src/index.ts` entry point, and a `package.json` that registers
   the project with Nx. It also retargets the Wrangler `$schema` to the
   workspace root and strips redundant package scripts.

3. **Serve the Worker locally**

   Now we can run the Worker in a local dev server:

   ```bash
   bunx nx run my-worker:serve
   ```

   This runs `wrangler dev` from the project root. The server is ready when
   Wrangler prints `Ready on http://localhost:8787`. Open that URL to see the
   Worker's response.

4. **Deploy to Cloudflare**

   When we're ready to deploy, we run:

   ```bash
   bunx nx run my-worker:deploy
   ```

   This runs `wrangler deploy`, which uploads the Worker to Cloudflare's edge
   network. On first deploy, Wrangler opens a browser to authenticate with your
   Cloudflare account. Pass Wrangler flags through after `--`:

   ```bash
   bunx nx run my-worker:deploy -- --dry-run
   ```

   The `--dry-run` flag validates the deployment without publishing.

</Steps>

## Verify

Confirm the inferred targets resolved correctly:

```bash
bunx nx show project my-worker
```

This lists `serve`, `deploy`, `typegen`, `version-upload`, and `tail`,
confirming the plugin registered the project.

To verify the deployment, visit the Worker's URL. Wrangler prints the URL on
successful deploy (e.g. `https://my-worker.<subdomain>.workers.dev`).

## Next steps

- [Application generator reference](/guides/generators-application) — all scaffolding
  options (templates, frameworks, languages)
- [Inferred targets reference](/inferred-targets) — `serve`, `deploy`, `typegen`,
  `version-upload`, `tail`
- [How Wrangler config inference works](/understanding/wrangler) — why the
  plugin reads your Wrangler config
- [Plugin options](/understanding/plugin-options) — customizing inferred target
  names
