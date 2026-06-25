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
[![All Contributors](https://img.shields.io/badge/all_contributors-4-orange.svg?style=flat-square)](#contributors-)

</div>

<hr>

Nx plugin for [Cloudflare Workers](https://developers.cloudflare.com/workers/). It wraps the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for target inference and uses [create-cloudflare (C3)](https://developers.cloudflare.com/workers/get-started/create-worker/) for project scaffolding.

## Features

- Scaffold Cloudflare Worker applications via create-cloudflare (C3) — Worker templates, web frameworks, or remote git templates.
- Generate Cloudflare Worker libraries (publishable, with bundler/linter/test options).
- Add bindings to an existing Worker (KV, R2, D1, Durable Objects, Queues, Workflows, Service/RPC) — edits `wrangler.jsonc`, stubs code + migrations, and refreshes `wrangler types`.
- Inferred `serve`, `deploy`, `typegen`, `version-upload`, and `tail` targets via the `@naxodev/nx-cloudflare/plugin` inference plugin — no hand-written `project.json` targets.
- Customizable inferred target names via `CloudflarePluginOptions`.
- Vitest wired automatically when the C3 template ships a Vitest config.

## Getting started

### Add to an existing workspace

```shell
nx add @naxodev/nx-cloudflare
```

### Generate a Cloudflare Worker

```shell
nx g @naxodev/nx-cloudflare:application my-worker
```

### Add a binding to a Worker

```shell
nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=kv --binding=MY_KV --id=<namespace-id>
```

## Compatibility

| Nx Version | Nx Cloudflare Version |
| ---------- | --------------------- |
| 17.x       | 1.x                   |
| 18.x       | 2.x                   |
| 19.x       | 3.x                   |
| 20.x       | 4.x                   |
| 21.x       | 5.x                   |
| 22.x       | 6.x                   |
| 23.x       | 7.x                   |

Wrangler v4 is a required peer dependency.

## Migrating to 7.0.0

7.0.0 is a breaking release. The old `serve`/`deploy`/`publish`/`next-build` executors are replaced by targets inferred from your Wrangler config, and **Next.js support is removed entirely** — the `next-build` executor and the vendored webpack subsystem (`next`, `webpack`, `@svgr/webpack`, `url-loader`, `copy-webpack-plugin`) are gone, so the install footprint is much smaller.

Run `nx migrate @naxodev/nx-cloudflare@latest`; the bundled migrations convert your existing targets and guide the non-deterministic parts. If you ran Next.js on Cloudflare through the dropped `@cloudflare/next-on-pages` path, move to [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (OpenNext) — the plugin no longer wraps Next.js.

See the [migration guide](https://nx-cloudflare.naxo.dev/community/migration/) for the full walkthrough.

## Docs

To read the full documentation, check out the
[docs](https://nx-cloudflare.naxo.dev/) site.

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
