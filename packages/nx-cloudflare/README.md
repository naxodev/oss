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

## Compatibility

| Nx Version | Nx Cloudflare Version |
| ---------- | --------------------- |
| 17.x       | 1.x                   |
| 18.x       | 2.x                   |
| 19.x       | 3.x                   |
| 20.x       | 4.x                   |
| 21.x       | 5.x                   |
| 22–23.x    | 6.x                   |

Wrangler v4 is a required peer dependency.

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
