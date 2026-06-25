---
title: Inferred targets
description: Reference for the Nx targets the plugin infers for each Worker — serve, deploy, typegen, version-upload, tail, D1 migrations, and secrets.
---

For every project with a [Wrangler config](/understanding/wrangler), the plugin infers a set of Nx targets that shell out to the Wrangler CLI. Target names are configurable — see [Plugin options](/understanding/plugin-options).

Forward flags to the underlying Wrangler command after `--`:

```bash
bunx nx <target> <my-worker> -- --some-wrangler-flag
```

## serve

Runs `wrangler dev` from the project root, starting a continuous local development server for the Worker.

- **Command:** `wrangler dev`
- **Continuous:** yes
- **Ready signal:** ready when Wrangler prints `Ready on http://...`, so dependent tasks wait for the server to be listening.

The dev server port is set via `dev.port` in the Wrangler config and defaults to `8787`.

```bash
bunx nx serve <my-worker> -- --remote
bunx nx serve <my-worker> -- --ip 0.0.0.0
```

See the [`wrangler dev` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#dev).

## deploy

Runs `wrangler deploy` from the project root, publishing the Worker to Cloudflare's edge network.

- **Command:** `wrangler deploy`
- **Continuous:** no

```bash
bunx nx deploy <my-worker> -- --dry-run
bunx nx deploy <my-worker> -- --name my-custom-worker
```

See the [`wrangler deploy` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#deploy).

## typegen

Runs `wrangler types` from the project root, generating `worker-configuration.d.ts` — the typed `Env` interface and Workers runtime types derived from the Wrangler config.

- **Command:** `wrangler types`
- **Continuous:** no
- **Cached:** yes
- **Inputs:** project files, upstream project files, and the `wrangler` external dependency
- **Outputs:** `{projectRoot}/worker-configuration.d.ts`

`worker-configuration.d.ts` is a generated artifact and is git-ignored. `typegen` is inferred only for Worker applications (projects with a Wrangler config); Worker libraries do not have one.

```bash
bunx nx typegen <my-worker> -- --name MyEnv
```

See the [`wrangler types` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#types).

## version-upload

Runs `wrangler versions upload` from the project root, uploading a new version of the Worker to Cloudflare's Versions API. This is the foundation for gradual deployments — rolling out new versions incrementally and rolling back instantly.

- **Command:** `wrangler versions upload`
- **Continuous:** no

```bash
bunx nx version-upload <my-worker> -- --message "fix: update handler"
```

See the [Wrangler versions docs](https://developers.cloudflare.com/workers/wrangler/commands/#versions).

## tail

Runs `wrangler tail` from the project root, streaming live logs from a deployed Worker in real time. For local development, use `serve` instead and read the terminal output directly.

- **Command:** `wrangler tail`
- **Continuous:** yes

```bash
bunx nx tail <my-worker> -- --status error
bunx nx tail <my-worker> -- --format json
```

See the [`wrangler tail` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#tail).

## D1 migration targets

D1 migration targets are inferred **only for jsonc/json Wrangler configs** (not TOML — there is no TOML parser in the plugin). One set of targets is emitted **per `d1_databases` binding**. With a single binding the targets use bare names (`d1-apply`, `d1-create`, `d1-list`); when a Worker has multiple D1 bindings the binding name is appended as a suffix (`d1-apply-DB`, `d1-apply-ANALYTICS`, etc.).

### d1-apply

Runs `wrangler d1 migrations apply <database>`. Applies pending migrations to the **local** database by default; pass `--remote` for production. Accepts `--env <environment>`.

```bash
bunx nx d1-apply <my-worker>           # apply locally (default)
bunx nx d1-apply <my-worker> --remote  # apply to the remote database
```

See the [`wrangler d1 migrations apply` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#d1-migrations-apply).

### d1-create

Runs `wrangler d1 migrations create <database> <message>`. Scaffolds a new migration file. Requires `--message`.

```bash
bunx nx d1-create <my-worker> --message=add_users
```

See the [`wrangler d1 migrations create` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#d1-migrations-create).

### d1-list

Runs `wrangler d1 migrations list <database>`. Lists applied and pending migrations. Uses the **local** database by default; pass `--remote` for production. Accepts `--env <environment>`.

```bash
bunx nx d1-list <my-worker>            # list local migrations
bunx nx d1-list <my-worker> --remote   # list remote migrations
```

See the [`wrangler d1 migrations list` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#d1-migrations-list).

## Secret targets

Secret targets are emitted for **every Worker** — secrets are not declared in the Wrangler config so no config parsing is needed. Secret values are **never passed as arguments**. All targets accept `--env <environment>`.

### secret-put

Runs `wrangler secret put <name>`. Prompts interactively for the secret value; requires `--name`.

```bash
bunx nx secret-put <my-worker> --name=API_KEY
```

See the [`wrangler secret put` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#secret-put).

### secret-bulk

Runs `wrangler secret bulk <file>`. Uploads multiple secrets from a JSON file; requires `--file=<path>`. Do not commit that file to source control.

```bash
bunx nx secret-bulk <my-worker> --file=secrets.json
```

See the [`wrangler secret bulk` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#secret-bulk).

### secret-list

Runs `wrangler secret list`. Lists all secrets bound to the Worker.

```bash
bunx nx secret-list <my-worker>
```

See the [`wrangler secret list` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#secret-list).

### secret-delete

Runs `wrangler secret delete <name>`. Deletes a secret; requires `--name`.

```bash
bunx nx secret-delete <my-worker> --name=API_KEY
```

See the [`wrangler secret delete` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/#secret-delete).

## Related

- [Wrangler config and target inference](/understanding/wrangler) — how the plugin detects Workers and where target options come from.
- [Plugin options](/understanding/plugin-options) — rename or disable inferred targets.
