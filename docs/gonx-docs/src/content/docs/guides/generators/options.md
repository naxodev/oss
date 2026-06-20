---
title: Plugin options
description: GoPluginOptions reference for the @naxodev/gonx plugin registration in nx.json.
---

Reference for the `GoPluginOptions` accepted by the `@naxodev/gonx` plugin registration in `nx.json`. The plugin infers Nx projects from every `go.mod` matched by `**/go.mod`.

## Usage

String form (all defaults apply):

```json
{
  "plugins": ["@naxodev/gonx"]
}
```

Object form:

```json
{
  "plugins": [
    {
      "plugin": "@naxodev/gonx",
      "options": {
        "buildTargetName": "build",
        "skipGoDependencyCheck": true
      }
    }
  ]
}
```

## Options

| Option                   | Type    | Default              | Description                                                         |
| ------------------------ | ------- | -------------------- | ------------------------------------------------------------------- |
| buildTargetName          | string  | `build`              | Name of the inferred build target. Inferred only for applications.  |
| testTargetName           | string  | `test`               | Name of the inferred test target.                                   |
| runTargetName            | string  | `serve`              | Name of the inferred run target. Inferred only for applications.    |
| tidyTargetName           | string  | `tidy`               | Name of the inferred tidy target.                                   |
| lintTargetName           | string  | `lint`               | Name of the inferred lint target.                                   |
| generateTargetName       | string  | `generate`           | Name of the inferred generate target.                               |
| releasePublishTargetName | string  | `nx-release-publish` | Name of the inferred release publish target.                        |
| tagName                  | string  | -                    | Tag applied to every inferred Go project.                           |
| skipGoDependencyCheck    | boolean | `false`              | Disables Go project dependency detection in the Nx workspace graph. |

## Notes

- Applications are projects with a `main.go` containing `package main` and `func main(`, or a `cmd/` directory. All other Go projects are treated as libraries.
- `buildTargetName` and `runTargetName` only affect applications; libraries never infer build or run targets regardless of these options.

## Next steps

- [Application generator](/guides/generators/application)
- [Library generator](/guides/generators/library)
- [Init generator](/guides/generators/init)
