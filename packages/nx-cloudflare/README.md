<p style="text-align: center;">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/nx-cloudflare.svg">
    <img alt="nx-cloudflare - Nx plugin for Cloudflare, in particular Cloudflare workers." src="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/nx-cloudflare.svg" width="100%">
  </picture>
</p>

<div style="text-align: center;">

[![MIT](https://img.shields.io/packagist/l/doctrine/orm.svg?style=flat-square)]()
[![commitizen](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)]()
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)]()
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)

</div>

<hr>

Nx plugin for Cloudflare.

## Features

- ✅ Generate Cloudflare Worker Application
  - ✅ Include Fetch Handler template
  - ✅ Include Scheduled Handler template
  - ✅ Vitest tests support
  - ✅ Inferred `serve`, `deploy`, `typegen`, `version-upload`, and `tail` targets (via the `@naxodev/nx-cloudflare/plugin` Crystal plugin).
- ✅ Generate Cloudflare Worker Library

## Installation

Nx Cloudflare is published as the `@naxodev/nx-cloudflare` package.

| Toolchain | Command                              |
| --------- | ------------------------------------ |
| NPM CLI   | `npm install @naxodev/nx-cloudflare` |
| PNPM CLI  | `pnpm add @naxodev/nx-cloudflare`    |
| Yarn CLI  | `yarn add @naxodev/nx-cloudflare`    |

## Compatibility

Nx Cloudflare is compatible with the following versions of Nx:

| Nx Version | Nx Cloudflare Version |
| ---------- | --------------------- |
| 17.x       | 1.x                   |
| 18.x       | 2.x                   |
| 19.x       | 3.x                   |
| 20.x       | 4.x                   |
| 21.x       | 5.x                   |

## Usage

### Cloudflare Worker Application

#### Generating a new Cloudflare Worker Application

```bash
nx g @naxodev/nx-cloudflare:application my-worker-app
```

Available options:

| Option                   | Type                                         | Default       | Description                                                                                                                                                                            |
| ------------------------ | -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                     | string                                       | \*required    | What name would you like to use?                                                                                                                                                       |
| template                 | fetch-handler, scheduled-handler, hono, none | fetch-handler | Which worker template do you want to use?                                                                                                                                              |
| projectNameAndRootFormat | as-provided, derived                         | as-provided   | Whether to generate the project name and root directory as provided (`as-provided`) or generate them composing their values and taking the configured layout into account (`derived`). |
| port                     | number                                       | 8787          | The port in which the worker will be run on development mode                                                                                                                           |
| accountId                | string                                       | null          | The Cloudflare account identifier where the worker will be deployed                                                                                                                    |
| configFormat             | jsonc, toml                                  | jsonc         | Format of the generated Wrangler configuration file (`wrangler.jsonc` or `wrangler.toml`).                                                                                             |
| js                       | boolean                                      | false         | Use JavaScript instead of TypeScript                                                                                                                                                   |
| tags                     | string                                       | null          | Add tags to the application (used for linting).                                                                                                                                        |
| unitTestRunner           | vitest, none                                 | vitest        | Test runner to use for unit tests.                                                                                                                                                     |
| directory                | string                                       | null          | The directory of the new application.                                                                                                                                                  |
| rootProject              | boolean                                      | false         | Create worker application at the root of the workspace                                                                                                                                 |
| skipFormat               | boolean                                      | false         | Skip formatting files.                                                                                                                                                                 |

##### Wrangler configuration format

The generator emits a [`wrangler.jsonc`](https://developers.cloudflare.com/workers/wrangler/configuration/) by default — Cloudflare's recommended format, and the only one that some newer Wrangler features support. The generated file includes a `$schema` reference (resolved relative to the workspace-root `node_modules`) so editors validate and autocomplete the config:

```jsonc
{
  "$schema": "../node_modules/wrangler/config-schema.json",
  "name": "my-worker-app",
  "compatibility_date": "2026-06-05",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/index.ts"
}
```

To generate a `wrangler.toml` instead, pass `--configFormat=toml`:

```bash
nx g @naxodev/nx-cloudflare:application my-worker-app --configFormat=toml
```

#### Inferred targets

Generated Worker projects get their targets from the `@naxodev/nx-cloudflare/plugin` inference plugin (registered in `nx.json` by the generator). Any project with a `wrangler.{jsonc,toml,json}` beside a `project.json`/`package.json` gets:

| Target           | Runs                       | Notes                                  |
| ---------------- | -------------------------- | -------------------------------------- |
| `serve`          | `wrangler dev`             | Continuous local dev server.           |
| `deploy`         | `wrangler deploy`          | Deploys the Worker.                    |
| `typegen`        | `wrangler types`           | Generates `worker-configuration.d.ts`. |
| `version-upload` | `wrangler versions upload` | Uploads a version (gradual deploys).   |
| `tail`           | `wrangler tail`            | Streams live logs.                     |

```bash
nx serve <my-app>
nx deploy <my-app>
```

These targets wrap the Wrangler CLI, so any Wrangler flag passes straight through after `--`:

```bash
nx serve <my-app> -- --remote
nx deploy <my-app> -- --dry-run
```

See the [`wrangler dev`](https://developers.cloudflare.com/workers/wrangler/commands/#dev) and [`wrangler deploy`](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) docs for the full flag list. The dev-server port is set via `dev.port` in the generated `wrangler` config (defaults to `8787`).

### Cloudflare Worker Library

#### Generating a new Cloudflare Worker Library

```bash
nx g @naxodev/nx-cloudflare:library my-worker-lib
```

Available options:

| Option                   | Type                          | Default     | Description                                                                                                                                                                            |
| ------------------------ | ----------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                     | string                        | \*required  | What name would you like to use?                                                                                                                                                       |
| directory                | string                        | null        | The directory of the new application.                                                                                                                                                  |
| projectNameAndRootFormat | as-provided, derived          | as-provided | Whether to generate the project name and root directory as provided (`as-provided`) or generate them composing their values and taking the configured layout into account (`derived`). |
| linter                   | eslint, none                  | eslint      | The tool to use for running lint checks.                                                                                                                                               |
| unitTestRunner           | vitest, none                  | vitest      | Test runner to use for unit tests.                                                                                                                                                     |
| tags                     | string                        | null        | Add tags to the application (used for linting).                                                                                                                                        |
| skipFormat               | boolean                       | false       | Skip formatting files.                                                                                                                                                                 |
| js                       | boolean                       | false       | Use JavaScript instead of TypeScript                                                                                                                                                   |
| strict                   | boolean                       | true        | Whether to enable tsconfig strict mode or not.                                                                                                                                         |
| publishable              | boolean                       | false       | Generate a publishable library.                                                                                                                                                        |
| importPath               | string                        | null        | The library name used to import it, like @myorg/my-awesome-lib. Required for publishable library.                                                                                      |
| bundler                  | swc, tsc, vite, esbuild, none | tsc         | Which bundler would you like to use to build the library? Choose 'none' to skip build setup.                                                                                           |
| minimal                  | boolean                       | false       | Generate a library with a minimal setup. No README.md generated.                                                                                                                       |
| simpleName               | boolean                       | false       | Don't include the directory in the generated file name.                                                                                                                                |

## Acknowledgement

This project is heavily inspired in the work done by other Nx Champions, check out their projects.

- <https://github.com/nxext/nx-extensions/tree/main>
- <https://github.com/klaascuvelier/nx-additions>

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/NachoVazquez">
          <img src="https://avatars3.githubusercontent.com/u/9338604?v=4?s=100" width="100px;" alt="Nacho Vazquez"/><br />
          <sub><b>Nacho Vazquez</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/issues?q=author%3ANachoVazquez" title="Bug reports">🐛</a>
        <a href="https://github.com/naxodev/oss/commits?author=NachoVazquez" title="Code">💻</a>
        <a href="https://github.com/naxodev/oss/commits?author=NachoVazquez" title="Documentation">📖</a>
        <a href="#example-NachoVazquez" title="Examples">💡</a>
        <a href="#ideas-NachoVazquez" title="Ideas, Planning, & Feedback">🤔</a>
        <a href="#mentoring-NachoVazquez" title="Mentoring">🧑‍🏫</a>
        <a href="#maintenance-NachoVazquez" title="Maintenance">🚧</a>
        <a href="#projectManagement-NachoVazquez" title="Project Management">📆</a>
        <a href="https://github.com/naxodev/oss/pulls?q=is%3Apr+reviewed-by%3ANachoVazquez" title="Reviewed Pull Requests">👀</a>
      </td>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/abelpenton">
          <img src="https://avatars.githubusercontent.com/u/32851047?v=4?s=100" width="100px;" alt="Abel Penton"/><br />
          <sub><b>Abel Penton</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=abelpenton" title="Code">💻</a>
        <a href="https://github.com/naxodev/oss/commits?author=abelpenton" title="Documentation">📖</a>
      </td>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/terrxo">
          <img src="https://avatars.githubusercontent.com/u/99985144?v=4?s=100" width="100px;" alt="Nik"/><br />
          <sub><b>Nik</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=terrxo" title="Code">💻</a>
      </td>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/Destreyf">
          <img src="https://avatars.githubusercontent.com/u/967304?v=4?s=100" width="100px;" alt="Chris Tunbridge"/><br />
          <sub><b>Chris Tunbridge</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=Destreyf" title="Code">💻</a>
      </td>
    </tr>
  </tbody>
</table>
