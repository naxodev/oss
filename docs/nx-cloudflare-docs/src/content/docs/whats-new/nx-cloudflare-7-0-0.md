---
title: Nx Cloudflare 7.0.0
description: Nx Cloudflare 7.0.0 moves Workers onto inferred targets, adds a binding generator, and drops the Next.js subsystem.
---

Nx Cloudflare 7.0.0 is the biggest release yet. It moves Worker lifecycle tasks
from hand-written executors to **targets inferred from your Wrangler config**,
adds a **binding generator** for KV/R2/D1/Durable Objects/Queues/Workflows/RPC,
leans on **Cloudflare's own create-cloudflare (C3)** scaffolder, and **removes
the Next.js + webpack subsystem**. Two migrations — one automatic, one
prompt-based — handle the upgrade.

## Inferred targets

Worker tasks are no longer scaffolded as `@naxodev/nx-cloudflare:serve` /
`:deploy` / `:publish` executors. Instead, every project with a
[Wrangler config](/understanding/wrangler) automatically gets a set of targets
that shell out to the Wrangler CLI:

| Target           | Runs                | What it does                                            |
| ---------------- | ------------------- | ------------------------------------------------------- |
| `serve`          | `wrangler dev`      | Local dev server (continuous; waits for "Ready on …").  |
| `deploy`         | `wrangler deploy`   | Publish the Worker to Cloudflare's edge.                |
| `typegen`        | `wrangler types`    | Generate `worker-configuration.d.ts` (`Env` + runtime). |
| `version-upload` | `wrangler versions` | Upload a new version without deploying it.              |
| `tail`           | `wrangler tail`     | Stream live production logs.                            |

Target names are configurable via the plugin options, and you forward raw
Wrangler flags after `--`:

```bash
bunx nx serve my-worker -- --remote
bunx nx deploy my-worker -- --dry-run
```

Because configuration now lives where Wrangler reads it natively, options that
used to be executor settings (port, vars, routes, compatibility flags) move into
your `wrangler.jsonc`/`.toml`. See the
[inferred targets reference](/inferred-targets).

## New binding generator

Wiring a resource into a Worker is now a one-liner. The `binding` generator edits
`wrangler.jsonc`, stubs any required code and migrations, emits a matching test,
and refreshes the generated `Env` types:

```bash
# A KV namespace
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=kv --binding=CACHE --id=abc123

# A Durable Object (adds the class stub + migration tag)
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=do --binding=COUNTER --name=Counter

# Provision an R2 bucket as you add it
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=r2 --binding=ASSETS --create
```

Supported types: `kv`, `r2`, `d1`, `do` (Durable Object), `queue`, `workflow`,
and `service` (RPC to another Worker). See the
[binding generator guide](/guides/generators-binding).

## Scaffolding with create-cloudflare (C3)

The application generator now wraps Cloudflare's own
[create-cloudflare (C3)](https://developers.cloudflare.com/workers/get-started/create-worker/)
CLI and then makes the result Nx-ready, so generated Workers match Cloudflare's
current templates and frameworks:

```bash
bunx nx g @naxodev/nx-cloudflare:application my-worker --framework=hono
```

Worker templates (`--type`), frameworks (`--framework`), and language
(`--lang`) are forwarded straight to C3. See the
[application generator guide](/guides/generators-application).

## Wrangler config quality-of-life

- **`wrangler.jsonc` by default.** New Workers get a JSONC config (comments +
  trailing commas), with a `configFormat` option to opt back into TOML.
- **`worker-configuration.d.ts` is a generated artifact.** It's produced by the
  cached `typegen` target and git-ignored, rather than checked in.
- **Inferred Vitest test target.** Generated Workers get a `test` target via
  `@nx/vitest` automatically.

## Breaking changes

- **Executors removed.** `serve`, `deploy`, `publish`, and `next-build`
  executors are gone; their tasks are re-provided as inferred targets. Custom
  executor options must move into your Wrangler config or onto the inferred
  target's command line.
- **Next.js + webpack subsystem removed.** The plugin no longer ships `withNx`,
  `composePlugins`, or the `next-build` executor. For Next.js on Cloudflare, use
  [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (OpenNext) or
  Cloudflare Pages. Non-Next.js Workers are unaffected.
- **Nx 23 + Wrangler v4.98** are now required.

## Upgrade

Run the migration — it generates a `migrations.json`, applies the deterministic
inference migration automatically, and prints prompt-based instructions for
removing Next.js references:

```bash
bunx nx migrate @naxodev/nx-cloudflare
bunx nx migrate --run-migrations
```

Then confirm the inferred targets resolve for each Worker:

```bash
bunx nx show project my-worker
```

The [migration guide](/community/migration) walks through both migrations in
full, including what to do with dropped executor options.
