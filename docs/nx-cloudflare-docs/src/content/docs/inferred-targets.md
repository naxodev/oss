---
title: Inferred targets
description: Reference for the Nx targets the plugin infers for each Worker — serve, deploy, typegen, version-upload, tail, D1 migrations, and secrets.
---

For every project with a [Wrangler config](/understanding/wrangler), the plugin infers a set of Nx targets that shell out to the Wrangler CLI. Target names are configurable — see [Plugin options](/understanding/plugin-options).

Forward flags to the underlying Wrangler command after `--`:

```bash
bunx nx run <my-worker>:<target> -- --some-wrangler-flag
```

## serve

Runs `wrangler dev` from the project root, starting a continuous local development server for the Worker.

- **Command:** `wrangler dev`
- **Continuous:** yes
- **Ready signal:** ready when Wrangler prints `Ready on http://...`, so dependent tasks wait for the server to be listening.

The dev server port is set via `dev.port` in the Wrangler config and defaults to `8787`.

```bash
bunx nx run <my-worker>:serve -- --remote
bunx nx run <my-worker>:serve -- --ip 0.0.0.0
```

See the [`wrangler dev` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#dev).

## deploy

Runs `wrangler deploy` from the project root, publishing the Worker to Cloudflare's edge network.

- **Command:** `wrangler deploy`
- **Continuous:** no

```bash
bunx nx run <my-worker>:deploy -- --dry-run
bunx nx run <my-worker>:deploy -- --name my-custom-worker
```

See the [`wrangler deploy` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy).

## typegen

Runs `wrangler types` from the project root, generating `worker-configuration.d.ts` — the typed `Env` interface and Workers runtime types derived from the Wrangler config.

- **Command:** `wrangler types`
- **Continuous:** no
- **Cached:** yes
- **Inputs:** project files, upstream project files, and the `wrangler` external dependency
- **Outputs:** `{projectRoot}/worker-configuration.d.ts`

`worker-configuration.d.ts` is a generated artifact and is git-ignored. `typegen` is inferred only for Worker applications (projects with a Wrangler config); Worker libraries do not have one.

```bash
bunx nx run <my-worker>:typegen -- --name MyEnv
```

See the [`wrangler types` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#types).

## version-upload

Runs `wrangler versions upload` from the project root, uploading a new version of the Worker to Cloudflare's Versions API. This is the foundation for gradual deployments — rolling out new versions incrementally and rolling back instantly.

- **Command:** `wrangler versions upload`
- **Continuous:** no

```bash
bunx nx run <my-worker>:version-upload -- --message "fix: update handler"
```

See the [Wrangler versions docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#versions-upload).

## tail

Runs `wrangler tail` from the project root, streaming live logs from a deployed Worker in real time. For local development, use `serve` instead and read the terminal output directly.

- **Command:** `wrangler tail`
- **Continuous:** yes

```bash
bunx nx run <my-worker>:tail -- --status error
bunx nx run <my-worker>:tail -- --format json
```

See the [`wrangler tail` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#tail).

## D1 migration targets

The plugin infers a `d1` target for each `d1_databases` binding in the Wrangler config. D1 inference is **only for jsonc/json Wrangler configs** (not TOML — there is no TOML parser in the plugin). The `d1` target exposes three Nx configurations: `apply`, `create`, and `list`.

Unlike the Worker lifecycle targets above, the D1 and secret targets are backed by a dedicated executor and accept **only the typed options documented below** (`--remote`, `--env`, `--message`, `--name`, `--file`, `--db`). Arbitrary `-- <wrangler flag>` passthrough does **not** apply to them.

### d1:apply

Runs `wrangler d1 migrations apply <database>`. Applies pending migrations to the **local** database by default; pass `--remote` for production. Accepts `--env <environment>`.

```bash
bunx nx run <my-worker>:d1:apply           # apply locally (default)
bunx nx run <my-worker>:d1:apply --remote  # apply to the remote database
```

See the [`wrangler d1 migrations apply` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/d1/#d1-migrations-apply).

### d1:create

Runs `wrangler d1 migrations create <database> <message>`. Scaffolds a new migration file. Requires `--message`.

```bash
bunx nx run <my-worker>:d1:create --message=add_users
```

See the [`wrangler d1 migrations create` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/d1/#d1-migrations-create).

### d1:list

Runs `wrangler d1 migrations list <database>`. Lists **unapplied** (pending) migration files — those not yet applied to the target database. Uses the **local** database by default; pass `--remote` for production. Accepts `--env <environment>`.

```bash
bunx nx run <my-worker>:d1:list            # list local migrations
bunx nx run <my-worker>:d1:list --remote   # list remote migrations
```

See the [`wrangler d1 migrations list` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/d1/#d1-migrations-list).

### Selecting a database with `--db`

When a Worker declares more than one `d1_databases` binding, pass `--db=<binding>` to select which database a command targets:

```bash
bunx nx run <my-worker>:d1:apply --db=ANALYTICS --remote
bunx nx run <my-worker>:d1:create --db=ANALYTICS --message=add_users
```

With a single D1 database, `--db` is optional. With multiple, omitting it errors and lists the valid bindings.

## Secret targets

The plugin infers a `secret` target for **every Worker** — secrets are not declared in the Wrangler config so no config parsing is needed. Secret values are **never passed as arguments**. All configurations accept `--env <environment>`. The `secret` target exposes four Nx configurations: `put`, `bulk`, `list`, and `delete`.

### secret:put

Runs `wrangler secret put <name>`. Prompts interactively for the secret value; requires `--name`.

```bash
bunx nx run <my-worker>:secret:put --name=API_KEY
```

See the [`wrangler secret put` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#secret-put).

### secret:bulk

Runs `wrangler secret bulk <file>`. Uploads multiple secrets from a JSON file; requires `--file=<path>`. Do not commit that file to source control.

```bash
bunx nx run <my-worker>:secret:bulk --file=secrets.json
```

See the [`wrangler secret bulk` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#secret-bulk).

### secret:list

Runs `wrangler secret list`. Lists all secrets bound to the Worker.

```bash
bunx nx run <my-worker>:secret:list
```

See the [`wrangler secret list` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#secret-list).

### secret:delete

Runs `wrangler secret delete <name>`. Deletes a secret; requires `--name`.

```bash
bunx nx run <my-worker>:secret:delete --name=API_KEY
```

See the [`wrangler secret delete` CLI docs](https://developers.cloudflare.com/workers/wrangler/commands/workers/#secret-delete).

## Related

- [Wrangler config and target inference](/understanding/wrangler) — how the plugin detects Workers and where target options come from.
- [Plugin options](/understanding/plugin-options) — rename or disable inferred targets.
