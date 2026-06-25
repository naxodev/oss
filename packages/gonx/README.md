<p style="text-align: center;">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/gonx.svg">
    <img alt="gonx - Nx plugin for Go/Golang" src="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/gonx.svg" width="100%">
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

Nx plugin for using [Go](https://go.dev/) in an Nx workspace — generators, inferred targets, and a tree-sitter–based dependency graph. A modernized fork of [nx-go](https://github.com/nx-go/nx-go).

📚 **Full documentation:** <https://gonx.naxo.dev/>

## Features

- Generate Go Applications
  - Customizable Go module setup
  - Well-structured Go code scaffolding
- Generate Go Libraries
- Full Nx integration
  - Inferred Tasks: Build, Generate, Tidy, Test, Serve, and Lint
  - Cacheable Tasks: Build, Generate, Tidy, Test, and Lint
  - GraphV2 Support
  - Version Actions for Go release
  - Nx Release Publish executor
- Use official Go commands in the background
- Dependency detection via tree-sitter static analysis (no Go
  required)

## Getting started

You need to have a [stable version of Go](https://go.dev/dl/)
installed on your machine. And... you are ready!

### Generate a Nx workspace with Go support

```shell
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

### Add to an existing workspace

```shell
nx add @naxodev/gonx
```

## Acknowledgements

This project is a fork of [nx-go](https://github.com/nx-go/nx-go), a
plugin for Nx that provides tools for building Go applications. Most
credit goes to the original maintainers of nx-go - we've built upon
their excellent foundation to modernize the plugin for the latest Nx
features.

## Contributors

Thanks goes to these wonderful people
([emoji key](https://allcontributors.org/docs/en/emoji-key)):

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
        <a href="https://github.com/creadicted">
          <img src="https://avatars.githubusercontent.com/u/1899013?v=4?s=100" width="100px;" alt="Wenzel"/><br />
          <sub><b>Wenzel</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=creadicted" title="Code">💻</a>
      </td>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/mpsanchis">
          <img src="https://avatars.githubusercontent.com/u/33475618?v=4?s=100" width="100px;" alt="Miguel"/><br />
          <sub><b>Miguel</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=mpsanchis" title="Code">💻</a>
      </td>
    </tr>
  </tbody>
</table>
