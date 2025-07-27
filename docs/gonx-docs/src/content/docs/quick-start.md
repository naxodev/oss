---
title: Quick Start
description: Get up and running with OSS workspace plugins
---

<div style="text-align: center;">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/gonx.svg" />
      <img alt="gonx - Nx plugin for Go/Golang" src="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/gonx.svg" width="100%" />
    </picture>
    <h3>GoNx</h3>
    <p>A modern Nx plugin for Go/Golang development</p>
  </div>

GoNx - Very opinionated Nx plugin for Go/Golang

**IMPORTANT:** This project is a fork of [@nx-go/nx-go](https://github.com/nx-go/nx-go). We give most of the credit to the original maintainers. We've built upon their excellent foundation to modernize the plugin for the latest Nx features.

The philosophy of gonx is to generate a non-invasive tooling to work with Go and Nx, heavily relying on inferred tasks and modern Nx features.

## Prerequisites

Before getting started, ensure you have:

- **Node.js** (version 18 or later)
- **npm**, **pnpm**, or **yarn** package manager
- **Nx CLI** (`npm install -g nx` or `npm install -g @nx/cli`)

For GoNx specifically:

- **Go** ([stable version](https://go.dev/dl/)) installed on your machine

## Installation

gonx is published as the `@naxodev/gonx` package.

| Toolchain | Command                     |
| --------- | --------------------------- |
| NPM CLI   | `npm install @naxodev/gonx` |
| PNPM CLI  | `pnpm add @naxodev/gonx`    |
| Yarn CLI  | `yarn add @naxodev/gonx`    |

## Compatibility

gonx is compatible with the following Nx versions:

| Nx Version | gonx Version      |
| ---------- | ----------------- |
| 21.x       | >=^1.0.0 <=^2.0.0 |

This plugin is only tested on [stable versions of Go](https://go.dev/dl/); older versions do not receive support. However, you can expect a fair degree of compatibility. Please note that multi-module Go workspaces require Go 1.18 or later.

## Choose Your Path

### Option 1: Create a New Workspace with GoNx

If you want to start a new workspace focused on Go development:

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

This will create a new Nx workspace pre-configured with GoNx.

### Option 2: Add to Existing Workspace

If you have an existing Nx workspace and want to add our plugins:

#### Add GoNx

```bash
nx add @naxodev/gonx
```

## Your First Project

### Create a Go Application

```bash
nx g @naxodev/gonx:application my-go-app
```

### Create a Go Library

```bash
nx g @naxodev/gonx:library my-go-lib
```

## Common Commands

Once you have projects set up, here are the most common commands you'll use:

### Building Projects

```bash
# Build a Go application
nx build my-go-app
```

### Running Projects

```bash
# Run a Go application
nx serve my-go-app
```

### Testing Projects

```bash
# Test a Go project
nx test my-go-app
```

## 📖 Generators & executors

### Generators

| Generator                                    | Description                                   |
| -------------------------------------------- | --------------------------------------------- |
| [`application`](../generators/application)   | Generate a Go application                     |
| [`go-blueprint`](../generators/go-blueprint) | Generate Go applications using Go Blueprint   |
| [`library`](../generators/library)           | Generate a Go library                         |
| [`init`](../generators/init)                 | Initialize gonx in an existing workspace      |
| [`preset`](../generators/preset)             | Preset generator for creating a new workspace |

### Executors

| Executor                                                | Description                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| [`build`](../executors/build)                           | Build a Go project                                |
| [`generate`](../executors/generate)                     | Run code generation using go generate             |
| [`lint`](../executors/lint)                             | Format and lint a Go project                      |
| [`serve`](../executors/serve)                           | Run a Go application                              |
| [`test`](../executors/test)                             | Run tests of a Go project                         |
| [`tidy`](../executors/tidy)                             | Ensures go.mod file matches a project source code |
| [`nx-release-publish`](../executors/nx-release-publish) | Lists the module in the Go registry               |

:::tip
You can run `nx list @naxodev/gonx` to view the list of plugin capabilities.
:::

Need more customization? See our [plugin configuration options](./docs/options.md).

#### Release Configuration

GoNx supports Nx's release process with Go's versioning conventions. We automatically set up project names to match their directory paths, which ensures compatibility with Go's release tagging convention (`projectRoot/vx.x.x`).

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

Key configuration points:

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
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/mpsanchis">
          <img src="https://avatars.githubusercontent.com/u/33475618?v=4?s=100" width="100px;" alt="Miguel"/><br />
          <sub><b>Miguel</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=mpsanchis" title="Code">💻</a>
      </td>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/abelpenton">
          <img src="https://avatars.githubusercontent.com/u/32851047?v=4?s=100" width="100px;" alt="Miguel"/><br />
          <sub><b>Abel</b></sub>
        </a><br />
        <a href="https://github.com/naxodev/oss/commits?author=abelpenton" title="Code">💻</a>
        <a href="https://github.com/naxodev/oss/commits?author=abelpenton" title="Documentation">📖</a>
      </td>
    </tr>
  </tbody>
</table>

## Acknowledgements

This project is a fork of [nx-go](https://github.com/nx-go/nx-go), a plugin for Nx that provides tools for building Go applications. Most credit goes to the original maintainers of nx-go - we've built upon their excellent foundation to modernize the plugin for the latest Nx features.

We're also inspired by the work done by other Nx Champions:

- <https://github.com/nxext/nx-extensions/tree/main>
- <https://github.com/klaascuvelier/nx-additions>

## Community

We value community contributions and feedback. Here's how you can get involved:

- **Discord**: Join our [Discord Server](https://discord.gg/zjDCGpKP2S) for real-time discussions
- **GitHub**: Contribute to our [open source repository](https://github.com/naxodev/oss/tree/main/packages/gonx)
- **Issues**: Report bugs and request features through [GitHub Issues](https://github.com/naxodev/oss/issues?q=sort%3Aupdated-desc+is%3Aissue+is%3Aopen)

## Getting Support

If you need help:

1. Check the documentation
2. Search existing GitHub issues
3. Join our Discord community for quick questions
4. Create a new GitHub issue for bugs or feature requests

Let's build something amazing together! 🚀
