---
title: init generator
description: Initialize the Nx Cloudflare plugin in an existing workspace.
---

The `init` generator sets up workspace-level dependencies and plugin registration for Cloudflare Workers development with Nx, running automatically via `nx add @naxodev/nx-cloudflare` and from the `application` and `library` generators.

## Usage

```bash
bunx nx g @naxodev/nx-cloudflare:init
```

## Options

| Option           | Type                         | Default  | Description                           |
| ---------------- | ---------------------------- | -------- | ------------------------------------- |
| `unitTestRunner` | `vitest` \| `jest` \| `none` | `vitest` | Test runner to use for unit tests.    |
| `js`             | boolean                      | `false`  | Use JavaScript instead of TypeScript. |
| `skipFormat`     | boolean                      | `false`  | Skip formatting files.                |

## Installed dependencies

The `init` generator runs `@nx/js:init` first, then adds the following packages:

| Package                           | Scope         | Pinned version  |
| --------------------------------- | ------------- | --------------- |
| `tslib`                           | dependency    | `^2.3.0`        |
| `wrangler`                        | devDependency | `^4.98.0`       |
| `@cloudflare/workers-types`       | devDependency | `^4.20260606.1` |
| `@cloudflare/vitest-pool-workers` | devDependency | `^0.16.0`       |
| `vitest`                          | devDependency | `^4.1.0`        |

It also registers `@naxodev/nx-cloudflare/plugin` in `nx.json` so that Worker lifecycle targets (`serve`, `deploy`, `typegen`, `version-upload`, `tail`) are inferred from Wrangler configs.

## Notes

The `init` generator does not re-add `@naxodev/nx-cloudflare` itself to `package.json` — the plugin invoking the generator is already installed.

## Next steps

- [application generator](/guides/generators-application) — scaffold a Worker application
- [library generator](/guides/generators-library) — scaffold a Worker library
- [Plugin options](/understanding/plugin-options) — inferred target names
