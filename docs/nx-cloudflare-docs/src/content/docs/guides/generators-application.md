---
title: application generator
description: Scaffold a Cloudflare Worker with create-cloudflare (C3) and make it Nx-ready.
---

The `create-cloudflare` generator wraps Cloudflare's [create-cloudflare (C3)](https://developers.cloudflare.com/workers/get-started/create-worker/) CLI to scaffold a Worker project, then makes it Nx-ready with Wrangler target inference and workspace-managed dependencies.

**Aliases:** `c3`, `application`, `app`

## Usage

```bash
bunx nx g @naxodev/nx-cloudflare:application my-worker
```

## Options

| Option           | Type                     | Default      | Description                                                                                                                                   |
| ---------------- | ------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `directory`      | string                   | _(required)_ | The directory of the new application. Takes the first positional argument.                                                                    |
| `name`           | string                   |              | The name of the application. Must match `^[a-zA-Z][^:]*$`.                                                                                    |
| `type`           | string                   |              | Worker template forwarded to C3 `--type` (e.g. `hello-world`, `hello-world-durable-object`, `scheduled`, `queues`, `openapi`).                |
| `framework`      | string                   |              | Web framework forwarded to C3 `--framework` (e.g. `react`, `hono`, `next`, `astro`, `svelte`, `vue`).                                         |
| `template`       | string                   |              | Remote git template forwarded to C3 `--template`.                                                                                             |
| `lang`           | `ts` \| `js` \| `python` | `ts`         | Language of the generated scaffold, forwarded to C3 `--lang`.                                                                                 |
| `c3Version`      | string                   | `2.70.0`     | Override the pinned create-cloudflare version to invoke.                                                                                      |
| `c3Args`         | string[]                 |              | Additional raw flags forwarded to C3. Generator-controlled flags (`git`, `deploy`, `open`, `auto-update`) cannot be overridden.               |
| `tags`           | string                   |              | Comma-separated tags added to the application (used for linting).                                                                             |
| `useProjectJson` | boolean                  | `false`      | Write an explicit `project.json`. Off by default — the worker is registered from its `package.json` and Wrangler config via target inference. |
| `skipFormat`     | boolean                  | `false`      | Skip formatting files.                                                                                                                        |

## Notes

Provide exactly one of `type`, `framework`, or `template` to control the C3 scaffold non-interactively. If none are provided, C3's interactive prompts guide selection.

## Next steps

- [Inferred targets](/inferred-targets) — `serve`, `deploy`, `typegen`, `version-upload`, `tail`
- [Plugin options](/understanding/plugin-options) — customizing inferred target names
- [Wrangler config](/understanding/wrangler) — config formats and inference
- [library generator](/guides/generators-library) — scaffold a Worker library
