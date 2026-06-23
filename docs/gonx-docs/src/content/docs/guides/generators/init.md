---
title: Init generator
description: Registers the gonx inference plugin in an Nx workspace and optionally creates a go.work file.
---

Registers the gonx inference plugin in `nx.json` and optionally creates a `go.work` file. Hidden from `nx list` and invoked automatically by the other generators.

## Usage

```bash
nx g @naxodev/gonx:init
```

## Options

| Option       | Type    | Default | Description                                                  |
| ------------ | ------- | ------- | ------------------------------------------------------------ |
| skipFormat   | boolean | `false` | Skip formatting files.                                       |
| addGoDotWork | boolean | `false` | Create a `go.work` file and add Go config to shared globals. |

## Notes

- `go.work` creation requires a locally installed Go toolchain that supports Go workspaces.
- Invoked by the application, library, and go-blueprint generators (and indirectly by the preset generator) with `skipFormat: true`.

## Next steps

- [Application generator](/guides/generators/application)
- [Library generator](/guides/generators/library)
- [Plugin options](/guides/generators/options)
