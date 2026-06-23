---
title: Migrate to 7.0.0
description: How to migrate to @naxodev/nx-cloudflare 7.0.0 — inferred targets and Next.js removal.
---

import { Steps } from '@astrojs/starlight/components';

7.0.0 replaces the old `serve`/`deploy`/`publish`/`next-build` executors with
targets inferred from your Wrangler config, and removes the Next.js + webpack
integration entirely. Two migrations handle the transition: one deterministic,
one prompt-based.

## Before you start

- Commit any uncommitted work. The migration modifies `nx.json` and project
  `project.json`/`package.json` files.
- Review the [inferred targets reference](/inferred-targets) to understand what
  the new targets look like.

## Steps

<Steps>

1. **Generate the migration file**

   Run `nx migrate` against the new version:

   ```bash
   bunx nx migrate @naxodev/nx-cloudflare
   ```

   Nx generates a `migrations.json` file listing the migrations to apply and
   the dependency version bumps (Nx 23, Wrangler v4.98). Review it before
   proceeding.

2. **Apply the deterministic migration**

   The `update-7-0-0-move-to-inference` migration runs automatically. It
   removes any project target whose executor is `@naxodev/nx-cloudflare:serve`,
   `:deploy`, `:publish`, or `:next-build`, and registers
   `@naxodev/nx-cloudflare/plugin` in `nx.json` so those targets are re-provided
   as inferred targets.

   ```bash
   bunx nx migrate --run-migrations
   ```

   If you had customized a removed target with executor options (e.g. `port`,
   `vars`, `routes`, `compatibility*`), the migration logs a warning naming the
   dropped option keys. Move that configuration into your Wrangler config
   (`wrangler.jsonc`/`.toml`), where Wrangler reads it natively, or pass it as
   command-line args to the inferred target.

3. **Remove Next.js references**

   The `update-7-0-0-drop-nextjs` migration is prompt-based — it generates
   instructions but does not modify files automatically. Search the workspace
   for references to the deleted symbols and remove or replace them:

   - **`next.config.js` / `next.config.mjs`** — remove imports of `withNx` or
     `composePlugins` from `@naxodev/nx-cloudflare`. If the config only existed
     to wrap Next.js for Cloudflare via this plugin, delete the wrapper and keep
     a plain Next.js config.
   - **`package.json`** — drop any `@naxodev/nx-cloudflare`-based Next.js build
     scripts that called the `next-build` executor or the webpack composition.
   - **Choose a replacement path for Next.js on Cloudflare.** This plugin no
     longer provides one. The Cloudflare-recommended approach is
     [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (OpenNext),
     which builds a Next.js app into a Cloudflare Worker. Migrate to it, or to
     Cloudflare Pages, as appropriate.

   Non-Next.js Workers are unaffected — only touch projects that referenced the
   removed symbols.

</Steps>

## Verify

Confirm the inferred targets resolve for each affected project:

```bash
bunx nx show project <name>
```

Check that `serve`, `deploy`, `typegen`, `version-upload`, and `tail` appear as
targets, and that no target references `@naxodev/nx-cloudflare:next-build`.

## Next steps

- [Inferred targets reference](/inferred-targets) — `serve`, `deploy`, `typegen`,
  `version-upload`, `tail`
- [How Wrangler config inference works](/understanding/wrangler) — why targets
  are inferred from your Wrangler config
- [Plugin options](/understanding/plugin-options) — customizing inferred target
  names
