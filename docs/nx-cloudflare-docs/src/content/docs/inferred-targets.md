---
title: Inferred targets
description: Reference for the Nx targets the plugin infers for each Worker — serve, deploy, typegen, version-upload, and tail.
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

## Related

- [Wrangler config and target inference](/understanding/wrangler) — how the plugin detects Workers and where target options come from.
- [Plugin options](/understanding/plugin-options) — rename or disable inferred targets.
