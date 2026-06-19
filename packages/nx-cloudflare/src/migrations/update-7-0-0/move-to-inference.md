# Move to inferred Cloudflare Worker targets

`@naxodev/nx-cloudflare` 7.0.0 replaces the hard-written `serve`/`deploy`
executors with targets inferred from your Wrangler config by the
`@naxodev/nx-cloudflare/plugin` inference plugin. This migration brings existing
workspaces in line with that model.

## What it does

- **Removes** any project target whose executor is one of the deleted
  `@naxodev/nx-cloudflare:serve`, `:deploy`, `:publish`, or `:next-build`. Left
  in place they fail with `Cannot find executor`.
- **Registers** `@naxodev/nx-cloudflare/plugin` once in `nx.json` (idempotent),
  so `serve` and `deploy` are re-provided as inferred targets for every project
  with a Wrangler config beside a `project.json`/`package.json`.

## What to check afterwards

The inferred targets run Wrangler directly and carry **no executor options**. If
you had customized a removed target (e.g. `port`, `vars`, `routes`,
`compatibility*`), the migration logs a warning naming the dropped option keys.
Move that configuration into your Wrangler config (`wrangler.jsonc`/`.toml`),
where it belongs, or pass it as command-line args to the inferred target.

Run `nx show project <name>` to confirm the `serve`/`deploy` targets resolve
from inference after the migration.
