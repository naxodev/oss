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
        "tailTargetName": "logs"
      }
    }
  ]
}
```

## Options

| Option                    | Type   | Default          | Description                                              |
| ------------------------- | ------ | ---------------- | -------------------------------------------------------- |
| `serveTargetName`         | string | `serve`          | Name for the inferred `wrangler dev` target.             |
| `deployTargetName`        | string | `deploy`         | Name for the inferred `wrangler deploy` target.          |
| `typegenTargetName`       | string | `typegen`        | Name for the inferred `wrangler types` target.           |
| `versionUploadTargetName` | string | `version-upload` | Name for the inferred `wrangler versions upload` target. |
| `tailTargetName`          | string | `tail`           | Name for the inferred `wrangler tail` target.            |

## Notes

The `application` and `init` generators register the plugin idempotently, matching either the string or object form. Changing target names after projects exist takes effect on the next Nx graph refresh — update any scripts, CI pipelines, or documentation that reference the old names.

## Next steps

- [Inferred targets](/inferred-targets) — `serve`, `deploy`, `typegen`, `version-upload`, `tail`
- [Wrangler config](/understanding/wrangler) — config formats and inference
- [application generator](/guides/generators-application) — scaffold a Worker application
