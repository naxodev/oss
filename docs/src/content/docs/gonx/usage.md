---
title: GoNx Usage
description: How to use GoNx for Go development in Nx workspaces
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

This guide covers the most common usage patterns for GoNx, from generating projects to building and deploying Go applications.

## Generators

GoNx provides several generators to scaffold Go projects and components.

### Go Applications

Generate a standard Go application:

```bash
nx g @naxodev/gonx:application my-go-app
```

#### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Application name |
| `directory` | string | - | Directory for the application |
| `tags` | string | - | Tags for the application (used for linting) |
| `unitTestRunner` | `vitest` \| `none` | `vitest` | Test runner for unit tests |
| `skipFormat` | boolean | `false` | Skip formatting files |

### Go Applications with Blueprint

Generate Go applications using [Go Blueprint](https://github.com/Melkeydev/go-blueprint):

```bash
nx g @naxodev/gonx:go-blueprint my-api --framework=gin --driver=postgres --git=commit
```

This generator leverages Go Blueprint to create more sophisticated application templates with different frameworks and database drivers.

#### Full-Stack Development

For full-stack applications, generate the Go API first, then add a separate frontend:

<Tabs>
<TabItem label="With React">
```bash
# Generate Go API
nx g @naxodev/gonx:go-blueprint my-api --framework=gin --driver=postgres --git=skip

# Generate React frontend
nx g @nx/react:app my-frontend --directory=apps/my-frontend
```
</TabItem>
<TabItem label="With Angular">
```bash
# Generate Go API  
nx g @naxodev/gonx:go-blueprint my-api --framework=gin --driver=postgres --git=skip

# Generate Angular frontend
nx g @nx/angular:app my-frontend --directory=apps/my-frontend
```
</TabItem>
</Tabs>

This approach ensures proper Nx project graph detection and provides better separation of concerns.

### Go Libraries

Generate reusable Go libraries:

```bash
nx g @naxodev/gonx:library my-go-lib
```

#### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Library name |
| `directory` | string | - | Directory for the library |
| `tags` | string | - | Tags for the library |
| `unitTestRunner` | `vitest` \| `none` | `vitest` | Test runner for unit tests |
| `skipFormat` | boolean | `false` | Skip formatting files |

## Executors

GoNx provides several executors that integrate with official Go commands.

### Building Applications

Build your Go applications:

```bash
nx build my-go-app
```

#### Custom Main File

Specify a custom main.go file:

```bash
nx build my-go-app --main=cmd/server/main.go
```

### Running Applications

Run Go applications in development:

```bash
nx serve my-go-app
```

You can also specify a custom main.go file:

```bash
nx serve my-go-app --main=cmd/server/main.go
```

### Testing Projects

Run tests for your Go projects:

```bash
nx test my-go-lib
```

GoNx uses Go's built-in testing framework and provides intelligent caching for faster subsequent test runs.

### Linting Projects

Format and lint your Go code:

```bash
nx lint my-go-lib
```

This runs `go fmt` and other Go linting tools to ensure code quality.

### Managing Dependencies

Keep your Go modules tidy:

```bash
nx tidy my-go-lib
```

This runs `go mod tidy` to ensure your `go.mod` file matches your source code.

### Code Generation

Run Go's code generation:

```bash
nx run my-go-lib:generate
```

Pass custom flags to the `go generate` command:

```bash
nx run my-go-lib:generate --flags=-v
```

## Nx Release Integration

GoNx integrates seamlessly with Nx's release system for publishing Go modules.

### Release Configuration

Configure your workspace for Go module releases in `nx.json`:

```json
{
  "release": {
    "projectsRelationship": "independent",
    "projects": ["your-go-project"],
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

#### Key Configuration Points

- **releaseTagPattern**: Set to `{projectName}/v{version}` for Go-compatible tags (e.g., `apps/myapp/v1.2.3`)
- **projectName**: With GoNx, this is the full path to your project
- **useLegacyVersioning**: Set to `false` to use GoNx's version actions

### Publishing Modules

Publish individual modules:

```bash
nx nx-release-publish my-go-lib
```

Or as part of the full release process:

```bash
nx release --publish
```

## Common Patterns

### Monorepo Structure

A typical GoNx monorepo structure:

```
apps/
  api/                    # Go API application
    cmd/
      main.go
    go.mod
    go.sum
  frontend/               # Frontend application (React/Angular)
    src/
    package.json
libs/
  shared/                 # Shared Go library
    go.mod
    *.go
  utils/                  # Utility Go library
    go.mod
    *.go
```

### Cross-Project Dependencies

GoNx automatically detects dependencies between Go projects based on Go module imports, enabling proper build ordering and caching.

### Environment Variables

Use environment variables in your Go applications:

```go
// In your Go code
port := os.Getenv("PORT")
if port == "" {
    port = "8080"
}
```

Set them in your executor configuration or `.env` files.

### Docker Integration

GoNx works well with Docker. Create a `Dockerfile` in your application root:

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main ./cmd

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
CMD ["./main"]
```

## Performance Tips

### Caching

GoNx automatically caches all operations. To maximize cache hits:

1. Use consistent Go versions across environments
2. Pin dependency versions in `go.mod`
3. Avoid file system operations that change timestamps

### Build Optimization

For faster builds:

1. Use Go modules for dependency management
2. Leverage Go's built-in caching
3. Consider using `go build -buildmode=exe` for applications

### Testing Strategy

Structure your tests for optimal caching:

1. Keep unit tests fast and deterministic
2. Use build tags for integration tests
3. Mock external dependencies

## Next Steps

- **Explore advanced features**: Check out the [GoNx reference](/reference/gonx/)
- **Set up CI/CD**: Configure automated builds and deployments
- **Migrate existing projects**: See the [migration guide](/gonx/migration/)
- **Get help**: Join our [Discord community](https://discord.gg/zjDCGpKP2S)
