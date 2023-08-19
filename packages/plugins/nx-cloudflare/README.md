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

</div>

<hr>

Nx plugin for Cloudflare, in particular Cloudflare workers.

## Features

- ✅ Generate Cloudflare Worker Application
- ✅ Include Fetch Handler template
- ✅ Include Scheduled Handler template
- ✅ Vitest tests support
- ✅ Serve and Publish executors

## Installation

Nx Cloudflare is published as the `@naxodev/nx-cloudflare` package.

| Toolchain | Command                              |
| --------- | ------------------------------------ |
| NPM CLI   | `npm install @naxodev/nx-cloudflare` |
| PNPM CLI  | `pnpm add @naxodev/nx-cloudflare`    |
| Yarn CLI  | `yarn add @naxodev/nx-cloudflare`    |

## Usage

### Generating new Cloudflare Worker Application

```bash
nx g @naxodev/nx-cloudflare:application my-worker-app
```

The available options are the following:

| Option          | Type                                         | Default       | Description                                                                               |
| --------------- | -------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| name            | string                                       | \*required    | What name would you like to use?                                                          |
| template        | fetch-handler, scheduled-handler, hono, none | fetch-handler | Which worker template do you want to use?                                                 |
| port            | number                                       | 8787          | The port in which the worker will be run on development mode                              |
| accountId       | string                                       | null          | The Cloudflare account identifier where the worker will be deployed                       |
| js              | boolean                                      | false         | Use JavaScript instead of TypeScript                                                      |
| tags            | string                                       | null          | Add tags to the application (used for linting).                                           |
| frontendProject | string                                       | null          | Frontend project that needs to access this application. This sets up proxy configuration. |
| unitTestRunner  | vitest, none                                 | vitest        | Test runner to use for unit tests.                                                        |
| directory       | string                                       | null          | The directory of the new application.                                                     |
| rootProject     | boolean                                      | false         | Create worker application at the root of the workspace                                    |
| skipFormat      | boolean                                      | false         | Skip formatting files.                                                                    |

### Serve worker on dev mode

```bash
nx serve <my-app>
```

The available options are the following:

| Option | Type   | Default | Description                                                  |
| ------ | ------ | ------- | ------------------------------------------------------------ |
| port   | number | 8787    | The port in which the worker will be run on development mode |

### Publish worker to Cloudflare

```bash
nx publish <my-app>
```

## Acknowledgement

This project is heavily inspired in the work done by other Nx Champions, check out their projects.

- https://github.com/nxext/nx-extensions/tree/main
- https://github.com/klaascuvelier/nx-additions

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/NachoVazquez"><img src="https://avatars3.githubusercontent.com/u/9338604?v=4?s=100" width="100px;" alt="Nacho Vazquez"/><br /><sub><b>Nacho Vazquez</b></sub></a><br /><a href="https://github.com/ngworker/lumberjack/issues?q=author%3ANachoVazquez" title="Bug reports">🐛</a> <a href="https://github.com/ngworker/lumberjack/commits?author=NachoVazquez" title="Code">💻</a> <a href="https://github.com/ngworker/lumberjack/commits?author=NachoVazquez" title="Documentation">📖</a> <a href="#example-NachoVazquez" title="Examples">💡</a> <a href="#ideas-NachoVazquez" title="Ideas, Planning, & Feedback">🤔</a> <a href="#mentoring-NachoVazquez" title="Mentoring">🧑‍🏫</a> <a href="#maintenance-NachoVazquez" title="Maintenance">🚧</a> <a href="#projectManagement-NachoVazquez" title="Project Management">📆</a> <a href="https://github.com/ngworker/lumberjack/pulls?q=is%3Apr+reviewed-by%3ANachoVazquez" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/ngworker/lumberjack/commits?author=NachoVazquez" title="Tests">⚠️</a> <a href="#tool-NachoVazquez" title="Tools">🔧</a> <a href="#userTesting-NachoVazquez" title="User Testing">📓</a></td>
      <td align="center" valign="top" width="14.28%
