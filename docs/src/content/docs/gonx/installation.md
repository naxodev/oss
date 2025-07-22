---
title: GoNx Installation
description: How to install and set up GoNx in your workspace
---

This guide covers the different ways to install and set up GoNx in your development environment.

## Prerequisites

Before installing GoNx, make sure you have:

- **Go** - [Install a stable version](https://go.dev/dl/) (required for Go development)
- **Node.js** - Version 18 or later
- **Nx** - Either globally installed or available in your project

:::tip
GoNx is only tested on stable versions of Go. Older versions do not receive support, but you can expect a fair degree of compatibility. Multi-module Go workspaces require Go 1.18 or later.
:::

## Installation Methods

### Method 1: Create New Workspace (Recommended)

The easiest way to get started is to create a new Nx workspace with GoNx pre-configured:

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

This command will:
1. Create a new Nx workspace
2. Install GoNx plugin
3. Set up initial configuration
4. Prompt you to choose between generating a library or application

### Method 2: Add to Existing Workspace

If you already have an Nx workspace, you can add GoNx using the `nx add` command:

```bash
nx add @naxodev/gonx
```

This will:
- Install the GoNx package
- Configure the plugin in your workspace
- Set up necessary files and configuration

### Method 3: Manual Installation

You can also install GoNx manually using your preferred package manager:

```bash
# Using npm
npm install @naxodev/gonx

# Using pnpm
pnpm add @naxodev/gonx

# Using yarn
yarn add @naxodev/gonx
```

After manual installation, you may need to run the init generator:

```bash
nx g @naxodev/gonx:init
```

## Compatibility

GoNx maintains compatibility with specific Nx versions:

| Nx Version | GoNx Version      |
| ---------- | ----------------- |
| 21.x       | >=^1.0.0 <=^2.0.0 |

:::caution
GoNx is designed for modern Nx versions only and breaks compatibility with older versions to leverage the latest features.
:::

## Verification

After installation, verify that GoNx is working correctly:

### Check Available Generators

```bash
nx list @naxodev/gonx
```

This should show all available generators and executors.

### Generate a Test Project

Create a simple Go library to test the installation:

```bash
nx g @naxodev/gonx:library test-lib
```

### Run Available Commands

Check that inferred tasks are working:

```bash
# List all projects (should include your Go projects)
nx show projects

# Show project details
nx show project test-lib

# Run a task
nx test test-lib
```

## Configuration

GoNx works with minimal configuration thanks to inferred tasks. However, you can customize behavior through various options.

### Workspace Configuration

In your `nx.json`, you can configure GoNx-specific settings:

```json
{
  "plugins": [
    {
      "plugin": "@naxodev/gonx",
      "options": {
        "addGoDotWork": false
      }
    }
  ]
}
```

### Available Options

- **addGoDotWork**: Create a `go.work` file for multi-module workspaces (default: `false`)

For detailed configuration options, see our [plugin configuration documentation](../reference/gonx/#configuration).

## Troubleshooting

### Go Not Found

If you get "go command not found" errors:

1. Ensure Go is installed: `go version`
2. Verify Go is in your PATH
3. Restart your terminal/IDE after installation

### Plugin Not Recognized

If Nx doesn't recognize the GoNx plugin:

1. Ensure the package is installed: `npm list @naxodev/gonx`
2. Clear Nx cache: `nx reset`
3. Try running the init generator: `nx g @naxodev/gonx:init`

### Tasks Not Inferred

If GoNx tasks aren't showing up:

1. Ensure your Go projects have `go.mod` files
2. Clear Nx cache: `nx reset`
3. Verify plugin configuration in `nx.json`

## Next Steps

Now that GoNx is installed:

1. **Create your first project**: Check out the [usage guide](/gonx/usage/)
2. **Explore generators**: Learn about all available generators
3. **Set up CI/CD**: Configure your build pipeline
4. **Join the community**: Get help on [Discord](https://discord.gg/zjDCGpKP2S)
