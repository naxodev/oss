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

</div>

<hr>

Very opinionated Nx plugin for Go/Golang. This project is a fork of [nx-go](https://github.com/nx-go/nx-go) with modernized code and updated dependencies. Most credit goes to the original project maintainers - we're building on their excellent work.

The philosophy of gonx is to generate a non-invasive tooling to work with go and nx, that means that we heavily rely on inferred tasks and that this project will not be compatible with older version of Nx.

## Features

- ✅ Generate Go Applications
  - ✅ Customizable Go module setup
  - ✅ Well-structured Go code scaffolding
- ✅ Generate Go Libraries
- ✅ Full Nx integration
  - ✅ Inferred Tasks: Build, Tidy, Test, Run, and Lint
  - ✅ GraphV2 Support
  - ✅ Version Actions for Go release
  - ✅ Nx Release Publish executor to release to list the module on the registry

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
| 20.x       | latest       |

## Usage

### Go Application

#### Generating a new Go Application

```bash
nx g @naxodev/gonx:application my-go-app
```

Available options:

| Option     | Type    | Default    | Description                                    |
| ---------- | ------- | ---------- | ---------------------------------------------- |
| name       | string  | \*required | Name of the Go application                     |
| directory  | string  | null       | The directory of the new application           |
| tags       | string  | null       | Add tags to the application (used for linting) |
| skipFormat | boolean | false      | Skip formatting files                          |

#### Building your Go application

```bash
nx build my-go-app
```

#### Running the tidy executor to manage dependencies

```bash
nx tidy my-go-app
```

### Go Library

#### Generating a new Go Library

```bash
nx g @naxodev/gonx:library my-go-lib
```

Available options:

| Option     | Type    | Default    | Description                                |
| ---------- | ------- | ---------- | ------------------------------------------ |
| name       | string  | \*required | Name of the Go library                     |
| directory  | string  | null       | The directory of the new library           |
| tags       | string  | null       | Add tags to the library (used for linting) |
| skipFormat | boolean | false      | Skip formatting files                      |

## Executors

gonx provides several executors to manage your Go projects within Nx:

### Build Executor

Builds a Go project using the Go compiler.

```bash
nx build my-go-app
```

Configuration options:

| Option     | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| main       | string   | -       | Path to the file containing the main() function (required) |
| compiler   | string   | "go"    | The Go compiler to use (possible values: 'go', 'tinygo')   |
| outputPath | string   | -       | The output path of the resulting executable                |
| buildMode  | string   | -       | Build mode to use                                          |
| env        | object   | -       | Environment variables to set when running the executor     |
| flags      | string[] | -       | Flags to pass to the go compiler                           |

### Serve Executor

Runs a Go application.

```bash
nx serve my-go-app
```

Configuration options:

| Option | Type     | Default | Description                                                |
| ------ | -------- | ------- | ---------------------------------------------------------- |
| main   | string   | -       | Path to the file containing the main() function (required) |
| cmd    | string   | "go"    | Name of the go binary to use                               |
| cwd    | string   | -       | Working directory from which to run the application        |
| args   | string[] | -       | Extra args when starting the app                           |
| env    | object   | -       | Environment variables to set when running the application  |

### Lint Executor

Formats and lints a Go project.

```bash
nx lint my-go-app
```

Configuration options:

| Option | Type     | Default  | Description                              |
| ------ | -------- | -------- | ---------------------------------------- |
| linter | string   | "go fmt" | The command to execute instead of go fmt |
| args   | string[] | -        | Extra args when linting the project      |

### Test Executor

Runs tests for a Go project.

```bash
nx test my-go-app
```

Configuration options:

| Option       | Type    | Default | Description                                                      |
| ------------ | ------- | ------- | ---------------------------------------------------------------- |
| cover        | boolean | false   | Enable coverage analysis                                         |
| coverProfile | string  | -       | Write a coverage profile to the file after all tests have passed |
| race         | boolean | false   | Enable race detector                                             |
| run          | string  | -       | Run only tests matching this regular expression                  |
| verbose      | boolean | false   | Enable verbose test output                                       |
| count        | number  | -       | Run test N times                                                 |
| timeout      | string  | "10m"   | Test timeout duration (0 to disable)                             |

### Tidy Executor

Ensures go.mod file matches the project's source code.

```bash
nx tidy my-go-app
```

Configuration options:

| Option  | Type    | Default | Description           |
| ------- | ------- | ------- | --------------------- |
| verbose | boolean | false   | Enable verbose output |

### Nx-Release-Publish Executor

Lists the module in the Golang registry.

```bash
nx nx-release-publish my-go-lib
```

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%">
  <a href="https://github.com/NachoVazquez"><img src="https://avatars3.githubusercontent.com/u/9338604?v=4?s=100" width="100px;" alt="Nacho Vazquez"/><br /><sub><b>Nacho Vazquez</b></sub></a><br /><a href="https://github.com/ngworker/lumberjack/issues?q=author%3ANachoVazquez" title="Bug reports">🐛</a> <a href="https://github.com/ngworker/lumberjack/commits?author=NachoVazquez" title="Code">💻</a> <a href="https://github.com/ngworker/lumberjack/commits?author=NachoVazquez" title="Documentation">📖</a> <a href="#example-NachoVazquez" title="Examples">💡</a> <a href="#ideas-NachoVazquez" title="Ideas, Planning, & Feedback">🤔</a> <a href="#mentoring-NachoVazquez" title="Mentoring">🧑‍🏫</a> <a href="#maintenance-NachoVazquez" title="Maintenance">🚧</a> <a href="#projectManagement-NachoVazquez" title="Project Management">📆</a> <a href="https://github.com/ngworker/lumberjack/pulls?q=is%3Apr+reviewed-by%3ANachoVazquez" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/ngworker/lumberjack/commits?author=NachoVazquez" title="Tests">⚠️</a> <a href="#tool-NachoVazquez" title="Tools">🔧</a> <a href="#userTesting-NachoVazquez" title="User Testing">📓</a></td></tr>    <tr>
    </tr>
</tbody></table>

## Acknowledgements

This project is a fork of [nx-go](https://github.com/nx-go/nx-go), a plugin for Nx that provides tools for building Go applications. Most credit goes to the original maintainers of nx-go - we've updated and modernized the codebase to work with newer versions of Nx.

We're also inspired by the work done by other Nx Champions:

- <https://github.com/nxext/nx-extensions/tree/main>
- <https://github.com/klaascuvelier/nx-additions>
