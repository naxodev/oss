# Preset Generator

Preset generator for creating a new workspace with gonx pre-configured. Choose between different project types to bootstrap your Go development.

## Usage

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

When you run this command, you'll be prompted to select a template type:

- **Binary** - Creates a Go application using the standard gonx generator
- **Library** - Creates a Go library using the gonx library generator
- **Go Blueprint** - Creates a Go application using Go Blueprint templates

## Options

| Option       | Type    | Default    | Description                                        |
| ------------ | ------- | ---------- | -------------------------------------------------- |
| type         | string  | "binary"   | Template type: "binary", "library", "go-blueprint" |
| directory    | string  | \*required | The directory of the new project                   |
| name         | string  | null       | The name of the project                            |
| tags         | string  | null       | Add tags to the project (used for linting)         |
| skipFormat   | boolean | false      | Skip formatting files                              |
| addGoDotWork | boolean | false      | Add this project to go.work file                   |

### Go Blueprint Specific Options

When `type` is set to "go-blueprint", additional options become available:

| Option    | Type   | Default | Description                                                                      |
| --------- | ------ | ------- | -------------------------------------------------------------------------------- |
| framework | string | "gin"   | Web framework (chi, gin, fiber, gorilla/mux, httprouter, standard-library, echo) |
| driver    | string | "none"  | Database driver (mysql, postgres, sqlite, mongo, redis, scylla, none)            |
| git       | string | "skip"  | Git handling (commit, stage, skip)                                               |
| feature   | array  | []      | Advanced features (react, htmx, githubaction, websocket, tailwind, docker)       |

## Examples

### Interactive Mode (Recommended)

```bash
npx create-nx-workspace my-go-workspace --preset=@naxodev/gonx
```

This will prompt you to select the template type and configure all options interactively.

### Create Binary Application

```bash
npx create-nx-workspace go-app --preset=@naxodev/gonx --type=binary
```

### Create Library

```bash
npx create-nx-workspace go-lib --preset=@naxodev/gonx --type=library
```

### Create Go Blueprint Application

```bash
npx create-nx-workspace go-api --preset=@naxodev/gonx --type=go-blueprint --framework=gin --driver=postgres --git=commit
```

### Go Blueprint with Advanced Features

```bash
npx create-nx-workspace go-app --preset=@naxodev/gonx \
  --type=go-blueprint \
  --framework=fiber \
  --driver=mysql \
  --git=stage \
  --feature=docker,react,tailwind
```

### With Go Workspace

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx \
  --type=go-blueprint \
  --framework=echo \
  --driver=sqlite \
  --addGoDotWork=true
```

## Template Types

### Binary

- Creates a standard Go application using gonx's application generator
- Simple `main.go` with basic structure
- Ready for immediate development with `nx build`, `nx serve`, etc.

### Library

- Creates a Go library using gonx's library generator
- Includes example library code and tests
- Configured for sharing and reuse

### Go Blueprint

- Uses [Go Blueprint](https://github.com/Melkeydev/go-blueprint) for advanced scaffolding
- Provides multiple web frameworks and database integrations
- Includes optional features like Docker, React, WebSockets, etc.
- Requires Go Blueprint to be installed (`go install github.com/melkeydev/go-blueprint@latest`)

## Project Structure

### Binary/Library Output

```
my-go-project/
├── main.go (or library code)
├── go.mod
├── go.sum
└── nx.json
```

### Go Blueprint Output

The structure varies based on selected framework and features, but typically includes:

```
my-go-project/
├── main.go
├── go.mod
├── go.sum
├── handlers/
├── models/
├── database/
├── static/
├── Dockerfile (if docker feature selected)
└── ... (additional files based on features)
```

## Notes

- Creates a new Nx workspace with gonx pre-configured
- Sets up the workspace with Go support and inferred tasks
- Ready to use immediately for Go development
- Go Blueprint option requires Go Blueprint to be installed
- Creates go.work file only when explicitly requested via the `addGoDotWork` option
- All template types support the full gonx toolchain (build, test, lint, etc.)

## Integration with Nx

After workspace creation, all standard Nx commands work immediately:

```bash
# Build your project
nx build

# Run your application
nx serve

# Run tests
nx test

# Lint code
nx lint

# View project graph
nx graph
```
