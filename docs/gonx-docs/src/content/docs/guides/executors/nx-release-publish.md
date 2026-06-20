---
title: nx-release-publish executor
description: Publishes a Go module to the Go proxy as part of the Nx release process.
---

The nx-release-publish executor publishes a Go module to the Go proxy (proxy.golang.org) by running `GOPROXY=proxy.golang.org go list -m <module>@<version>`. The version is resolved from the latest git tag matching the release tag pattern configured in `nx.json`.

The manifest key in `executors.json` is `release-publish`. The inferred target name is `nx-release-publish`.

## Usage

```bash
nx nx-release-publish my-go-lib
```

Or through the Nx release pipeline:

```bash
nx release --publish
```

## Options

| Option     | Type    | Default      | Description                                                |
| ---------- | ------- | ------------ | ---------------------------------------------------------- |
| moduleRoot | string  | project root | Path to the directory containing the go.mod file.          |
| dryRun     | boolean | false        | When true, print the publish command without executing it. |

The `NX_DRY_RUN` environment variable also triggers a dry run when set to `true`.

## Inferred target

Inferred for all Go projects (applications and libraries):

```json
{
  "executor": "@naxodev/gonx:release-publish",
  "options": {
    "moduleRoot": "{projectRoot}"
  },
  "configurations": {
    "development": {
      "dryRun": true
    }
  }
}
```

The `development` configuration sets `dryRun: true`, allowing test runs via `--configuration=development`.

The default release tag pattern is `v{version}`. Override it in `nx.json` under `release.releaseTag.pattern`, which supports `{projectName}` and `{version}` placeholders.

## Next steps

- [Build executor](/guides/executors/build)
- [Plugin options](/guides/generators/options)
- [Quick start](/getting-started/quick-start)
