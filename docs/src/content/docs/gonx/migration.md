---
title: Migration from nx-go
description: Guide for migrating from the original nx-go plugin to GoNx
---

This guide helps you migrate from the original [@nx-go/nx-go](https://github.com/nx-go/nx-go) plugin to GoNx.

:::caution
Although GoNx works well as a drop-in replacement for nx-go in most cases, our philosophy and core implementation have changed since the first fork, which may cause some workflows designed for nx-go not to work with GoNx.
:::

## Overview of Changes

GoNx is a modernized fork of nx-go with significant architectural changes:

### Major Breaking Changes

1. **Modern Nx-only**: Requires Nx 21.x or later
2. **No project.json generation**: Uses inferred tasks instead
3. **Changed command execution**: Runs from project root instead of workspace root
4. **Removed go.work creation**: Now opt-in via configuration
5. **Removed legacy generators**: `convert-to-one-module` is no longer available

### New Features

1. **Inferred tasks**: Automatic task detection and configuration
2. **Cacheable operations**: All tasks are properly cached
3. **CreateNodesV2**: Latest Nx project detection API
4. **Version Actions**: Proper Go versioning with Nx Release
5. **Publish executor**: Automated registry publishing

## Migration Steps

### Step 1: Prerequisites

Before starting the migration:

1. **Upgrade Nx**: Ensure you're on Nx 21.x or later
2. **Update Go**: Use a stable Go version (1.21+ recommended)
3. **Backup your workspace**: Create a backup before making changes
4. **Review project structure**: Understand your current setup

### Step 2: Remove nx-go Plugin

Remove the original nx-go plugin:

```bash
npm uninstall @nx-go/nx-go
# or
pnpm remove @nx-go/nx-go
# or
yarn remove @nx-go/nx-go
```

### Step 3: Install GoNx

Install the GoNx plugin:

```bash
npm install @naxodev/gonx
# or
pnpm add @naxodev/gonx
# or
yarn add @naxodev/gonx
```

### Step 4: Update Nx Configuration

Update your `nx.json` to use GoNx:

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

Remove any nx-go specific configuration.

### Step 5: Handle project.json Files

GoNx uses inferred tasks, so you can remove `project.json` files from your Go projects:

:::caution
Keep `project.json` files for non-Go projects or if you need custom task configuration.
:::

```bash
# Remove project.json files from Go projects
rm apps/my-go-app/project.json
rm libs/my-go-lib/project.json
```

:::tip
The inferred target configurations are available in the [executor's](/gonx/executors/generate) documentation in case modifications are needed.
:::

### Step 6: Update Scripts and CI

Update any scripts or CI configurations that reference nx-go:

#### Package.json Scripts

```json
{
  "scripts": {
    "build:go": "nx run-many --target=build --projects=tag:go",
    "test:go": "nx run-many --target=test --projects=tag:go"
  }
}
```

#### CI Configuration

Update your CI to use the new executors and ensure Go is available in the environment.

## Common Migration Issues

### Issue: Tasks Not Found

**Problem**: Nx doesn't recognize Go project tasks.

**Solution**:

1. Ensure `go.mod` files exist in your Go projects
2. Clear Nx cache: `nx reset`
3. Verify plugin configuration in `nx.json`

### Issue: Build Failures

**Problem**: Builds fail due to path changes.

**Solution**:

1. Update any hardcoded paths in your Go code
2. Ensure imports use proper module paths
3. Check that `go.mod` files have correct module names

### Issue: Custom Executors Missing

**Problem**: Custom nx-go executors are no longer available.

**Solution**:

1. Use GoNx's built-in executors
2. Create custom executors if needed
3. Use shell commands as a fallback

### Issue: Project Graph Issues

**Problem**: Project dependencies aren't detected correctly.

**Solution**:

1. Ensure Go imports are correctly structured
2. Use proper module paths
3. Clear cache and regenerate: `nx reset && nx graph`

## Feature Mapping

Here's how nx-go features map to GoNx:

| nx-go Feature        | GoNx Equivalent       | Notes                     |
| -------------------- | --------------------- | ------------------------- |
| `@nx-go/nx-go:build` | Inferred `build` task | Automatic detection       |
| `@nx-go/nx-go:test`  | Inferred `test` task  | Improved caching          |
| `@nx-go/nx-go:lint`  | Inferred `lint` task  | Uses `go fmt`             |
| `@nx-go/nx-go:serve` | Inferred `serve` task | Runs from project root    |
| Manual project.json  | Inferred tasks        | Cleaner project structure |
| Custom executors     | Built-in + extensible | Modern Nx patterns        |

## Post-Migration Testing

After migration, verify everything works:

### 1. Project Detection

```bash
nx show projects
```

### 2. Task Execution

```bash
nx build my-go-app
nx test my-go-lib
nx lint my-go-app
```

### 3. Project Graph

```bash
nx graph
```

### 4. Caching

```bash
nx build my-go-app
nx build my-go-app  # Should use cache
```

## Getting Help

If you encounter issues during migration:

1. **Check documentation**: Review GoNx documentation thoroughly
2. **Search issues**: Look for similar issues on GitHub
3. **Join Discord**: Get real-time help on our [Discord server](https://discord.gg/zjDCGpKP2S)
4. **Create issue**: Report bugs or request help on GitHub
