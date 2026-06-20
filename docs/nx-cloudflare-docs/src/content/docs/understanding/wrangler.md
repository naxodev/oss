---
title: How Wrangler config inference works
description: Why the inference plugin reads your Wrangler config and what it looks for.
---

The `@naxodev/nx-cloudflare/plugin` inference plugin detects Wrangler config
files and infers Worker lifecycle targets from them. Understanding why it works
the way it does helps when something goes wrong — a project with no targets, a
broken `$schema`, or a config the plugin silently skips.

## Why wrangler.jsonc is the default format

The `application` generator scaffolds `wrangler.jsonc` because Cloudflare
recommends JSONC as the primary config format. Some newer Wrangler features are
only available in JSONC and JSON — TOML support is maintained for backward
compatibility but lags behind.

The inference plugin accepts all three formats (`wrangler.jsonc`,
`wrangler.toml`, `wrangler.json`), but JSONC has a practical advantage in the
plugin: JSONC files are parsed with a JSONC-aware parser (Nx's `parseJson`),
so comments and trailing commas don't cause a parse failure. TOML files get a
lighter check — the plugin has no TOML parser, so it only verifies the file is
non-empty. A syntactically broken `wrangler.toml` passes the plugin's gate and
fails later at Wrangler runtime, while a broken `wrangler.jsonc` is caught and
skipped with a warning during graph construction.

## Why $schema retargeting matters in monorepos

C3 scaffolds a `wrangler.jsonc` with a `$schema` pointing at
`./node_modules/wrangler/config-schema.json`. In a standalone project this works
because Wrangler is installed locally. In a monorepo with hoisted dependencies,
Wrangler lives at the workspace root — the project-local `node_modules` doesn't
exist, and editors can't resolve the schema.

The `application` generator retargets the `$schema` to the workspace root using
`offsetFromRoot`:

```jsonc title="wrangler.jsonc"
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "compatibility_date": "2026-06-05",
  "main": "src/index.ts"
}
```

The retargeting is done as a string replace that preserves JSONC comments, not
a full JSON round-trip. If you create a Wrangler config manually in a monorepo,
point the `$schema` at the workspace-root `node_modules`, not the project-local
one — otherwise editor validation and autocomplete break silently.

## Why a sibling project file is required

The inference plugin matches `**/wrangler.{toml,jsonc,json}`, but not every
match is a project root. A `wrangler.toml` in a subdirectory of a Worker project
(e.g. a config fragment, a test fixture) is not an Nx project. To avoid
inferring spurious targets, the plugin checks whether the config's directory
contains a `project.json` or `package.json`. If neither is present, the file is
ignored — no targets are inferred, no warning is logged.

This is why the `application` generator writes a `package.json` by default
(rather than only a `project.json`): the package.json is the project's source of
truth in the TypeScript solution setup, and it satisfies the inference gate. The
optional `useProjectJson` flag writes a `project.json` instead, which also
satisfies the gate. Either file works; the plugin checks for either.

## Why empty and unparseable configs are skipped

The plugin validates each config file before inferring targets. The gate is
structural, not semantic: it checks that the file is readable and parseable, not
that the contents make sense for Wrangler. This is deliberate — Wrangler
validates its own config at runtime, and duplicating that validation in the
plugin would couple the plugin to Wrangler's schema and create maintenance
burden.

Three cases are skipped with a warning:

- **Unreadable files** — a permissions error, a broken symlink, or a race
  condition. The warning names the file and the error.
- **Empty `.toml` files** — a zero-length or whitespace-only `wrangler.toml`.
  Since there's no TOML parser, non-empty is the only available proxy for
  "usable."
- **Unparseable `.json`/`.jsonc` files** — a syntax error that fails `parseJson`.
  The warning names the file and the parse error.

A parseable but minimal config (e.g. `{}`) is accepted, because Wrangler fills
in defaults at runtime. The plugin doesn't second-guess Wrangler's config
semantics.

## How compatibility_date and compatibility_flags affect typegen

The `typegen` target runs `wrangler types`, which generates
`worker-configuration.d.ts` — the typed `Env` interface and Workers runtime
types. Two Wrangler config settings shape that output:

- **`compatibility_date`** — controls which Workers runtime features are
  available. Setting it to a recent date unlocks newer APIs in the generated
  types.
- **`compatibility_flags`** — opt-in flags like `nodejs_compat` that change
  which runtime types are present.

Because these settings affect the generated types, changing them requires
re-running `typegen` to refresh `worker-configuration.d.ts`. The `typegen`
target is cached and keyed on project files plus the installed `wrangler`
version, so Nx re-runs it when the Wrangler config changes.

See the [typegen target reference](/inferred-targets#typegen) for the full target
behavior, and the [Cloudflare Wrangler configuration docs](https://developers.cloudflare.com/workers/wrangler/configuration/)
for the complete config schema.

## Why target names are configurable

The plugin infers five targets with default names (`serve`, `deploy`, `typegen`,
`version-upload`, `tail`). These names are configurable via
`CloudflarePluginOptions` because workspaces may have existing targets with the
same name (e.g. a `serve` target from `@nx/vite`), or may follow different
naming conventions. The plugin accepts options in `nx.json` to rename any or
all inferred targets. See the [plugin options reference](/understanding/plugin-options)
for the exact shape and defaults.
