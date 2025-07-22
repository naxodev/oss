---
title: GoNx Reference
description: Complete reference for GoNx generators, executors, and configuration options
---

This page provides comprehensive reference documentation for all GoNx generators, executors, and configuration options.

## Generators

### application

Generate a Go application.

```bash
nx g @naxodev/gonx:application <name> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Application name |
| `directory` | string | - | Directory for the application |
| `tags` | string | - | Tags for the application (used for linting) |
| `unitTestRunner` | `vitest` \| `none` | `vitest` | Test runner for unit tests |
| `skipFormat` | boolean | `false` | Skip formatting files |

#### Example

```bash
nx g @naxodev/gonx:application my-api --directory=apps/api --tags=backend
```

### go-blueprint

Generate Go applications using Go Blueprint.

```bash
nx g @naxodev/gonx:go-blueprint <name> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Application name |
| `framework` | string | - | Framework to use (gin, fiber, chi, etc.) |
| `driver` | string | - | Database driver (postgres, mysql, sqlite, etc.) |
| `git` | `commit` \| `skip` | `skip` | Git initialization behavior |
| `directory` | string | - | Directory for the application |
| `tags` | string | - | Tags for the application |
| `skipFormat` | boolean | `false` | Skip formatting files |

#### Example

```bash
nx g @naxodev/gonx:go-blueprint my-api --framework=gin --driver=postgres --git=commit
```

### library

Generate a Go library.

```bash
nx g @naxodev/gonx:library <name> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Library name |
| `directory` | string | - | Directory for the library |
| `tags` | string | - | Tags for the library |
| `unitTestRunner` | `vitest` \| `none` | `vitest` | Test runner for unit tests |
| `skipFormat` | boolean | `false` | Skip formatting files |

#### Example

```bash
nx g @naxodev/gonx:library shared-utils --directory=libs/utils --tags=shared
```

### init

Initialize GoNx in an existing workspace.

```bash
nx g @naxodev/gonx:init [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `addGoDotWork` | boolean | `false` | Create go.work file for multi-module workspace |
| `skipFormat` | boolean | `false` | Skip formatting files |

#### Example

```bash
nx g @naxodev/gonx:init --addGoDotWork
```

### preset

Preset generator for creating a new workspace.

```bash
npx create-nx-workspace <workspace-name> --preset=@naxodev/gonx
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Workspace name |
| `packageManager` | `npm` \| `pnpm` \| `yarn` | `npm` | Package manager to use |

## Executors

### build

Build a Go project.

```bash
nx build <project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `main` | string | `main.go` | Entry point file |
| `outputPath` | string | `dist/{projectRoot}` | Output directory |
| `ldflags` | string | - | Linker flags |
| `gcflags` | string | - | Compiler flags |
| `asmflags` | string | - | Assembler flags |
| `tags` | string | - | Build tags |
| `race` | boolean | `false` | Enable race detector |
| `msan` | boolean | `false` | Enable memory sanitizer |
| `asan` | boolean | `false` | Enable address sanitizer |
| `cover` | boolean | `false` | Enable coverage instrumentation |
| `covermode` | `set` \| `count` \| `atomic` | `set` | Coverage mode |
| `coverpkg` | string | - | Coverage package pattern |

#### Example

```bash
nx build my-app --main=cmd/server/main.go --tags="production" --race
```

### serve

Run a Go application.

```bash
nx serve <project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `main` | string | `main.go` | Entry point file |
| `args` | string[] | - | Arguments to pass to the application |
| `env` | object | - | Environment variables |
| `cwd` | string | - | Working directory |

#### Example

```bash
nx serve my-app --main=cmd/server/main.go --args="--port=8080"
```

### test

Run tests for a Go project.

```bash
nx test <project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `coverprofile` | string | - | Coverage profile output file |
| `race` | boolean | `false` | Enable race detector |
| `msan` | boolean | `false` | Enable memory sanitizer |
| `asan` | boolean | `false` | Enable address sanitizer |
| `cover` | boolean | `false` | Enable coverage analysis |
| `covermode` | `set` \| `count` \| `atomic` | `set` | Coverage mode |
| `coverpkg` | string | - | Coverage package pattern |
| `tags` | string | - | Build tags |
| `timeout` | string | `10m` | Test timeout |
| `parallel` | number | - | Number of parallel tests |
| `count` | number | `1` | Number of times to run tests |
| `failfast` | boolean | `false` | Stop on first test failure |
| `short` | boolean | `false` | Run short tests only |
| `v` | boolean | `false` | Verbose output |
| `args` | string[] | - | Additional test arguments |

#### Example

```bash
nx test my-lib --cover --race --timeout=30s --v
```

### lint

Format and lint a Go project.

```bash
nx lint <project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fix` | boolean | `true` | Automatically fix formatting issues |

#### Example

```bash
nx lint my-app --fix
```

### tidy

Ensure go.mod file matches project source code.

```bash
nx tidy <project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `compat` | string | - | Go version compatibility |
| `e` | boolean | `false` | Update go.mod even if no changes |
| `v` | boolean | `false` | Verbose output |
| `go` | string | - | Go version to use |

#### Example

```bash
nx tidy my-lib --compat=1.21 --v
```

### generate

Run code generation using go generate.

```bash
nx generate <project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `run` | string | - | Regular expression for generators to run |
| `skip` | string | - | Regular expression for generators to skip |
| `tags` | string | - | Build tags |
| `x` | boolean | `false` | Print commands but do not run them |
| `v` | boolean | `false` | Verbose output |
| `n` | boolean | `false` | Print commands without running |

#### Example

```bash
nx generate my-lib --run=".*" --v
```

### nx-release-publish

Publish module to Go registry.

```bash
nx nx-release-publish <project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tag` | string | - | Git tag for the release |
| `firstRelease` | boolean | `false` | First release for the module |
| `dryRun` | boolean | `false` | Print what would be done without doing it |

#### Example

```bash
nx nx-release-publish my-lib --tag=v1.0.0
```

## Configuration

### Plugin Configuration

Configure GoNx in your `nx.json`:

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

#### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `addGoDotWork` | boolean | `false` | Create go.work file for multi-module workspace |

### Project Configuration

GoNx uses inferred tasks, so minimal configuration is needed. However, you can override settings:

```json
{
  "name": "my-go-app",
  "targets": {
    "build": {
      "options": {
        "main": "cmd/server/main.go",
        "outputPath": "dist/apps/my-go-app"
      }
    }
  }
}
```

### Release Configuration

Configure Nx Release for Go modules in `nx.json`:

```json
{
  "release": {
    "projectsRelationship": "independent",
    "projects": ["apps/my-app", "libs/my-lib"],
    "releaseTagPattern": "{projectName}/v{version}",
    "changelog": {
      "workspaceChangelog": false,
      "projectChangelogs": true
    },
    "version": {
      "useLegacyVersioning": false
    }
  }
}
```

#### Release Options

| Option | Type | Description |
|--------|------|-------------|
| `releaseTagPattern` | string | Pattern for release tags (use `{projectName}/v{version}` for Go) |
| `projectsRelationship` | `independent` \| `fixed` | How projects are versioned together |
| `useLegacyVersioning` | boolean | Use legacy versioning (set to `false` for GoNx) |

## Inferred Tasks

GoNx automatically detects and configures these tasks for Go projects:

### Detection Criteria

- **Go Module**: Project contains `go.mod` file
- **Main Package**: Project contains `main.go` or files in `cmd/` directory
- **Library**: Project contains `.go` files but no main package

### Available Tasks

| Task | Description | Cache Inputs | Cache Outputs |
|------|-------------|--------------|---------------|
| `build` | Compile Go application | `**/*.go`, `go.mod`, `go.sum` | `{outputPath}` |
| `test` | Run Go tests | `**/*.go`, `**/*_test.go`, `go.mod` | `coverage.out` |
| `lint` | Format Go code | `**/*.go` | - |
| `tidy` | Update go.mod | `**/*.go`, `go.mod` | `go.mod`, `go.sum` |
| `generate` | Run go generate | `**/*.go`, `go.mod` | `**/*.go` |
| `serve` | Run Go application | `**/*.go`, `go.mod` | - |

### Cache Configuration

All tasks are automatically configured with appropriate cache settings:

```json
{
  "cacheableOperations": ["build", "test", "lint", "tidy", "generate"]
}
```

## Environment Variables

### Build-time Variables

Set during build process:

| Variable | Description |
|----------|-------------|
| `GOOS` | Target operating system |
| `GOARCH` | Target architecture |
| `CGO_ENABLED` | Enable/disable CGO |
| `GO111MODULE` | Go modules mode |

### Runtime Variables

Available during execution:

| Variable | Description |
|----------|-------------|
| `GOMAXPROCS` | Maximum number of OS threads |
| `GODEBUG` | Debug settings |
| `GOMEMLIMIT` | Memory limit |

## TypeScript Types

For TypeScript integration, GoNx provides these types:

```typescript
interface GoNxExecutorOptions {
  main?: string;
  outputPath?: string;
  args?: string[];
  env?: Record<string, string>;
}

interface GoNxGeneratorOptions {
  name: string;
  directory?: string;
  tags?: string;
  skipFormat?: boolean;
}
```

## Examples

### Basic Application

```bash
# Generate application
nx g @naxodev/gonx:application my-api

# Build application  
nx build my-api

# Run application
nx serve my-api

# Test application
nx test my-api
```

### Library with Dependencies

```bash
# Generate library
nx g @naxodev/gonx:library shared-utils

# Generate application that uses library
nx g @naxodev/gonx:application my-app

# Build everything
nx build my-app
```

### Release Workflow

```bash
# Version and release
nx release --first-release

# Or version specific projects
nx release --projects=my-lib version patch

# Publish to registry
nx release --publish
```

This reference covers all available options and configurations for GoNx. For more detailed examples and guides, see the [usage documentation](/gonx/usage/).
