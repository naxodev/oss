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
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

</div>

<hr>

# gonx - Very opinionated Nx plugin for Go/Golang

**IMPORTANT:** This project is a fork of [@nx-go/nx-go](https://github.com/nx-go/nx-go). We give most of the credit to the original maintainers. We've built upon their excellent foundation to modernize the plugin for the latest Nx features.

The philosophy of gonx is to generate a non-invasive tooling to work with Go and Nx, heavily relying on inferred tasks and modern Nx features.

## ✨ Features

- ✅ Generate Go Applications
  - ✅ Customizable Go module setup
  - ✅ Well-structured Go code scaffolding
- ✅ Generate Go Libraries
- ✅ Full Nx integration
  - ✅ Inferred Tasks: Build, Tidy, Test, Run, and Lint
  - ✅ Cacheable Tasks: Build, Tidy, Test, and Lint
  - ✅ GraphV2 Support
  - ✅ Version Actions for Go release
  - ✅ Nx Release Publish executor to release to list the module on the registry
- ✅ Use official Go commands in the background
- ✅ Efficient caching and dependency graph tools for Go projects

## 🚀 Getting started

You need to have a [stable version of Go](https://go.dev/dl/) installed on your machine. And... you are ready!

### Generate a Nx workspace with Go support

```shell
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

### Add to an existing workspace

```shell
nx add @naxodev/gonx
```

### Don't want to use a multi-module Go workspace?

The plugin configures a [multi-module Go workspace](https://go.dev/doc/tutorial/workspaces) by default, to simplify project management and improve the quality of the Nx graph. If you don't want to take advantage of this feature, you can use generator `convert-to-one-mod` after the plugin installation. Generators will automatically adapt to your configuration.

```shell
nx g @naxodev/gonx:convert-to-one-mod
```

## 📖 Generators & executors

### Generators

| Generator                                                       | Description                                         |
| --------------------------------------------------------------- | --------------------------------------------------- |
| [`application`](./docs/generators/application.md)               | Generate a Go application                           |
| [`library`](./docs/generators/library.md)                       | Generate a Go library                               |
| [`convert-to-one-mod`](./docs/generators/convert-to-one-mod.md) | Convert a multi-module workspace to a single module |
| [`init`](./docs/generators/init.md)                             | Initialize gonx in an existing workspace            |
| [`preset`](./docs/generators/preset.md)                         | Preset generator for creating a new workspace       |

### Executors

| Executor                                                       | Description                                       |
| -------------------------------------------------------------- | ------------------------------------------------- |
| [`build`](./docs/executors/build.md)                           | Build a Go project                                |
| [`lint`](./docs/executors/lint.md)                             | Format and lint a Go project                      |
| [`serve`](./docs/executors/serve.md)                           | Run a Go application                              |
| [`test`](./docs/executors/test.md)                             | Run tests of a Go project                         |
| [`tidy`](./docs/executors/tidy.md)                             | Ensures go.mod file matches a project source code |
| [`nx-release-publish`](./docs/executors/nx-release-publish.md) | Lists the module in the Go registry               |

> [!TIP]
> You can use `nx list @naxodev/gonx` to see list capabilities.

Need more customization? See our [plugin configuration options](./docs/options.md).

## Changes from the original nx-go

- Modern Nx-only, we break compatibility with older versions of Nx.
- We brought cacheable tasks to the table.
- Migrated to the latest version of Nx (21)
- Implemented the CreateNodesV2, enabling inferred tasks
- We have an inferred-tasks first approach
- Removed the generation of the project.json for applications and libraries
  - We follow the philosophy of keeping non-js monorepos as pure as possible
- Implemented the new `VersionActions` to enable version generation when using `nx release` with Go applications and libraries
  - Project names now use the full path to ensure compatibility with Go's release tagging convention (`projectRoot/vx.x.x`)
- Implemented the `publish` executor to use with `nx release` for publishing applications and libraries to the Go registry
- Modified the build and serve executors to work with nested `main.go` packages (previously required manual `main.go` location)
- Removed the generate executor (we plan to support generation options that better fit the Nx model)

## Installation

gonx is published as the `@naxodev/gonx` package.

| Toolchain | Command                     |
| --------- | --------------------------- |
| NPM CLI   | `npm install @naxodev/gonx` |
| PNPM CLI  | `pnpm add @naxodev/gonx`    |
| Yarn CLI  | `yarn add @naxodev/gonx`    |

## Compatibility

gonx is compatible with the following versions of Nx:

| Nx Version | gonx Version |
| ---------- | ------------ |
| 21.x       | 1.0.0        |

This plugin is only tested on [stable versions of Go](https://go.dev/dl/), older versions do not receive support. However, you can expect a fair degree of compatibility. Please note that multi-module Go workspaces require Go 1.18 or later.

## Usage

Here are some common usage examples for gonx. For detailed options and configurations, click on the executor or generator name in the sections above.

### Go Applications

#### Creating a new Go application

```bash
nx g @naxodev/gonx:application my-go-app
```

See the [application generator docs](./docs/generators/application.md) for all options.

#### Building a Go application

```bash
nx build my-go-app
```

See the [build executor docs](./docs/executors/build.md) for all options.

#### Running a Go application

```bash
nx serve my-go-app
```

See the [serve executor docs](./docs/executors/serve.md) for all options.

### Go Libraries

#### Creating a new Go library

```bash
nx g @naxodev/gonx:library my-go-lib
```

See the [library generator docs](./docs/generators/library.md) for all options.

#### Testing a Go project

```bash
nx test my-go-lib
```

See the [test executor docs](./docs/executors/test.md) for all options.

#### Linting a Go project

```bash
nx lint my-go-lib
```

See the [lint executor docs](./docs/executors/lint.md) for all options.

#### Managing Go dependencies

```bash
nx tidy my-go-lib
```

See the [tidy executor docs](./docs/executors/tidy.md) for all options.

### Publishing Go Modules

```bash
nx nx-release-publish my-go-lib
```

Or as part of the Nx release process:

```bash
nx release --publish
```

#### Release Configuration

gonx supports Nx's release process with Go's versioning conventions. We automatically set up project names to match their directory paths, which ensures compatibility with Go's release tagging convention (`projectRoot/vx.x.x`).

To configure your workspace for releasing Go modules, add a configuration like this to your `nx.json`:

```json
{
  "release": {
    "projectsRelationship": "independent",
    "projects": ["your-go-project"],
    "releaseTagPattern": "{projectName}/v{version}", // important! this is the Go release tag pattern
    "changelog": {
      ...
    },
    "version": {
      "useLegacyVersioning": false, // important! this means that we are using the plugin version actions
      ...
    },
  }
}
```

Key points about this configuration:

- `releaseTagPattern`: Set to `{projectName}/v{version}` to create Go-compatible tags (e.g., `apps/myapp/v1.2.3`)
- `projectName`: With gonx, this is the full path to your project, not just the directory name

See the [nx-release-publish executor docs](./docs/executors/nx-release-publish.md) for more information.

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
        <a href="https://github.com/creadicted">
          <img src="https://avatars.githubusercontent.com/u/1899013?v=4?s=100" width="100px;" alt="Wenzel"/><br />
          <sub><b>Wenzel</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=creadicted" title="Code">💻</a>
      </td>
    </tr>
  </tbody>
</table>

## Acknowledgements

This project is a fork of [nx-go](https://github.com/nx-go/nx-go), a plugin for Nx that provides tools for building Go applications. Most credit goes to the original maintainers of nx-go - we've built upon their excellent foundation to modernize the plugin for the latest Nx features.

We're also inspired by the work done by other Nx Champions:

- <https://github.com/nxext/nx-extensions/tree/main>
- <https://github.com/klaascuvelier/nx-additions>
