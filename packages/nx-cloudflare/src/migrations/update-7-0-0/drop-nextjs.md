# Remove the dropped Next.js + webpack integration

`@naxodev/nx-cloudflare` 7.0.0 **removes Next.js support entirely** (#126). The
following were deleted from the package and no longer resolve:

- the `@naxodev/nx-cloudflare:next-build` executor;
- the webpack plugin `@naxodev/nx-cloudflare/plugins/with-nx` (`withNx`);
- the plugin composition helper `@naxodev/nx-cloudflare/src/utils/compose-plugins`
  (`composePlugins`).

The companion `update-7-0-0-move-to-inference` migration already strips
`next-build` **targets** from `project.json`. This migration covers the
remaining wiring that lives in source files Nx cannot rewrite deterministically.

## What to do

Search the workspace for any remaining references and remove or replace them:

1. **`next.config.js` / `next.config.mjs`** — remove imports of `withNx` /
   `composePlugins` from `@naxodev/nx-cloudflare`. If the config only existed to
   wrap Next.js for Cloudflare via this plugin, delete the wrapper and keep a
   plain Next.js config.
2. **`package.json`** — drop any `@naxodev/nx-cloudflare`-based Next.js build
   scripts that called the `next-build` executor or the webpack composition.
3. **Choose a supported path for running Next.js on Cloudflare.** This plugin no
   longer provides one. The current Cloudflare-recommended approach is
   [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (OpenNext),
   which builds a Next.js app into a Cloudflare Worker. Migrate Next.js projects
   to it, or to Cloudflare Pages, as appropriate.

## What to leave alone

Non-Next.js Workers are unaffected — their `serve`/`deploy` targets come from
the `@naxodev/nx-cloudflare/plugin` inference plugin (see the
`update-7-0-0-move-to-inference` migration). Only touch projects that actually
referenced the removed Next.js/webpack symbols above.

After changes, run `nx show project <name>` on each affected project and confirm
no target still references `@naxodev/nx-cloudflare:next-build`.
