---
title: Migration from nx-go
description: Guide for migrating from the original nx-go plugin to GoNx
---

This guide helps you migrate from the original [@nx-go/nx-go](https://github.com/nx-go/nx-go) plugin to GoNx.

:::caution
GoNx introduces breaking changes and is not a drop-in replacement for nx-go. This migration requires careful planning and testing.
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

### Step 5: Handle Project.json Files

GoNx uses inferred tasks, so you can remove `project.json` files from your Go projects:

```bash
# Remove project.json files from Go projects
rm apps/my-go-app/project.json
rm libs/my-go-lib/project.json
```

:::tip
Keep `project.json` files for non-Go projects or if you need custom task configuration.
:::

### Step 6: Update Build Targets

If you had custom build configurations in `project.json`, you may need to adjust them:

#### Before (nx-go)
```json
{
  "targets": {
    "build": {
      "executor": "@nx-go/nx-go:build",
      "options": {
        "main": "main.go",
        "outputPath": "dist/apps/my-app"
      }
    }
  }
}
```

#### After (GoNx)
GoNx infers build tasks automatically. If you need custom configuration, you can override specific options using task configuration in `nx.json` or create a minimal `project.json`.

### Step 7: Update Scripts and CI

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

### Step 8: Handle go.work Files

GoNx doesn't create `go.work` files by default. If you need them:

1. **Enable in configuration**:
```json
{
  "plugins": [
    {
      "plugin": "@naxodev/gonx",
      "options": {
        "addGoDotWork": true
      }
    }
  ]
}
```

2. **Or create manually** if you prefer full control.

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

| nx-go Feature | GoNx Equivalent | Notes |
|---------------|-----------------|-------|
| `@nx-go/nx-go:build` | Inferred `build` task | Automatic detection |
| `@nx-go/nx-go:test` | Inferred `test` task | Improved caching |
| `@nx-go/nx-go:lint` | Inferred `lint` task | Uses `go fmt` |
| `@nx-go/nx-go:serve` | Inferred `serve` task | Runs from project root |
| Manual project.json | Inferred tasks | Cleaner project structure |
| Custom executors | Built-in + extensible | Modern Nx patterns |

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

## Rollback Plan

If you need to rollback:

1. **Restore backup**: Use your workspace backup
2. **Reinstall nx-go**: `npm install @nx-go/nx-go`
3. **Restore configurations**: Restore `nx.json` and `project.json` files
4. **Clear cache**: `nx reset`

## Getting Help

If you encounter issues during migration:

1. **Check documentation**: Review GoNx documentation thoroughly
2. **Search issues**: Look for similar issues on GitHub
3. **Join Discord**: Get real-time help on our [Discord server](https://discord.gg/zjDCGpKP2S)
4. **Create issue**: Report bugs or request help on GitHub

## Benefits After Migration

Once migrated, you'll enjoy:

- **Better performance**: Improved caching and task execution
- **Cleaner projects**: No more project.json clutter
- **Modern features**: Latest Nx capabilities
- **Better reliability**: Official Go command integration
- **Active maintenance**: Regular updates and improvements

The migration effort pays off with a more maintainable and performant setup! 🚀
