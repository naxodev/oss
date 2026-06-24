---
title: library generator
description: Generate a Cloudflare Worker library with Workers runtime types.
---

The `library` generator creates a Cloudflare Worker library — a shareable package with Workers runtime types, suitable for shared logic, bindings, or utilities consumed by Worker applications.

**Alias:** `lib`

## Usage

```bash
bunx nx g @naxodev/nx-cloudflare:library my-worker-lib
```

## Options

| Option                    | Type                                            | Default      | Description                                                                                    |
| ------------------------- | ----------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `directory`               | string                                          | _(required)_ | The directory of the new library. Takes the first positional argument.                         |
| `name`                    | string                                          |              | The name of the library. Must match `^[a-zA-Z][^:]*$`.                                         |
| `linter`                  | `eslint` \| `none`                              | `eslint`     | The tool to use for running lint checks.                                                       |
| `unitTestRunner`          | `vitest` \| `none`                              | _(prompted)_ | Test runner to use for unit tests.                                                             |
| `bundler`                 | `swc` \| `tsc` \| `vite` \| `esbuild` \| `none` | `tsc`        | The bundler to use. `none` means the library is not buildable.                                 |
| `publishable`             | boolean                                         | `false`      | Generate a publishable library.                                                                |
| `importPath`              | string                                          |              | The library name used to import it (e.g. `@myorg/my-lib`). Required for publishable libraries. |
| `js`                      | boolean                                         | `false`      | Generate JavaScript files rather than TypeScript files.                                        |
| `strict`                  | boolean                                         | `true`       | Enable tsconfig strict mode.                                                                   |
| `tags`                    | string                                          |              | Comma-separated tags added to the library (used for linting).                                  |
| `minimal`                 | boolean                                         | `false`      | Generate a library with minimal setup. No README.md generated.                                 |
| `simpleName`              | boolean                                         | `false`      | Don't include the directory in the generated file name.                                        |
| `config`                  | `workspace` \| `project` \| `npm-scripts`       | `project`    | Where to configure the project's executors.                                                    |
| `skipFormat`              | boolean                                         | `false`      | Skip formatting files.                                                                         |
| `skipPackageJson`         | boolean                                         | `false`      | Do not add dependencies to `package.json`.                                                     |
| `skipTsConfig`            | boolean                                         | `false`      | Do not update `tsconfig.json` for development experience.                                      |
| `skipTypeCheck`           | boolean                                         | `false`      | Skip TypeScript type checking for SWC compiler.                                                |
| `setParserOptionsProject` | boolean                                         | `false`      | Configure the ESLint `parserOptions.project` option. Off by default for lint performance.      |

## Notes

Publishable libraries require `importPath` and cannot use `bundler=none`. Non-publishable libraries have `bundler` forced to `none` (not buildable) regardless of the value passed.

Worker libraries have no Wrangler config, so no inferred targets are generated (`serve`, `deploy`, `typegen`, etc. are not available). Workers runtime types come from `@cloudflare/workers-types` via `tsconfig.lib.json`, not a generated `worker-configuration.d.ts`.

## Verify

```bash
bunx nx show project my-worker-lib
```

The library appears in the graph at the directory you generated it in.

## Next steps

- [application generator](/guides/generators-application) — scaffold a Worker application
- [init generator](/guides/generators-init) — workspace-level setup
- [Plugin options](/understanding/plugin-options) — inferred target names
