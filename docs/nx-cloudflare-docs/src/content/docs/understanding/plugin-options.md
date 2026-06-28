---
title: Plugin Options
description: CloudflarePluginOptions reference for the inference plugin registration.
---

`CloudflarePluginOptions` configures the target names inferred by the `@naxodev/nx-cloudflare/plugin` inference plugin. All options are optional — omitting them applies the defaults.

## Registration

The plugin is registered in `nx.json`. Both forms are supported.

### String form (defaults only)

```json title="nx.json"
{
  "plugins": ["@naxodev/nx-cloudflare/plugin"]
}
```

### Object form (custom target names)

```json title="nx.json"
{
  "plugins": [
    {
      "plugin": "@naxodev/nx-cloudflare/plugin",
      "options": {
        "serveTargetName": "dev",
        "deployTargetName": "publish",
        "typegenTargetName": "types",
        "versionUploadTargetName": "upload-version",
        "versionDeployTargetName": "promote",
        "tailTargetName": "logs",
        "d1TargetName": "migrate",
        "secretTargetName": "env-secret"
      }
    }
  ]
}
```

## Options

| Option                    | Type   | Default          | Description                                                                                       |
| ------------------------- | ------ | ---------------- | ------------------------------------------------------------------------------------------------- |
| `serveTargetName`         | string | `serve`          | Name for the inferred `wrangler dev` target.                                                      |
| `deployTargetName`        | string | `deploy`         | Name for the inferred `wrangler deploy` target.                                                   |
| `typegenTargetName`       | string | `typegen`        | Name for the inferred `wrangler types` target.                                                    |
| `versionUploadTargetName` | string | `version-upload` | Name for the inferred `wrangler versions upload` target.                                          |
| `versionDeployTargetName` | string | `version-deploy` | Name for the inferred `wrangler versions deploy` target.                                          |
| `tailTargetName`          | string | `tail`           | Name for the inferred `wrangler tail` target.                                                     |
| `d1TargetName`            | string | `d1`             | Name for the inferred D1 migrations target (configurations: `apply`, `create`, `list`).           |
| `secretTargetName`        | string | `secret`         | Name for the inferred secret-management target (configurations: `put`, `bulk`, `list`, `delete`). |

## Notes

The `application` and `init` generators register the plugin idempotently, matching either the string or object form. Changing target names after projects exist takes effect on the next Nx graph refresh — update any scripts, CI pipelines, or documentation that reference the old names.

The `d1` and `secret` subcommands (`apply`, `create`, `list`, `put`, `bulk`, `delete`) are exposed as fixed Nx configurations and are not individually renamable — only the `d1` and `secret` target names themselves are configurable.

## Next steps

- [Inferred targets](/inferred-targets) — `serve`, `deploy`, `typegen`, `version-upload`, `tail`
- [Wrangler config](/understanding/wrangler) — config formats and inference
- [application generator](/guides/generators-application) — scaffold a Worker application
