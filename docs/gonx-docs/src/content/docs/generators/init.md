---
title: Init Generator
description: Initializes gonx in an existing Nx workspace
---

:::caution
This is an internal generator, not intended to be use directly as Nx does.
:::

## Usage

```bash
nx g @naxodev/gonx:init
```

## Options

This generator does not have configurable options.

## Example

```bash
nx g @naxodev/gonx:init
```

## Notes

- Sets up the workspace for Go development
- Configures the workspace for Go development
- Can be used with `nx add @naxodev/gonx` to add gonx to an existing workspace
- Creates the necessary configuration files for Go development
- Creates go.work file only when explicitly requested via the `addGoDotWork` option
