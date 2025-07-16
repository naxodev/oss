# Go Blueprint Generator

Uses [Go Blueprint](https://github.com/Melkeydev/go-blueprint) to generate Go applications with various frameworks and features. This generator integrates Go Blueprint's powerful scaffolding capabilities with Nx's workflow.

## Prerequisites

Go Blueprint must be installed on your system:

```bash
go install github.com/melkeydev/go-blueprint@latest
```

For detailed installation instructions, visit [Go Blueprint documentation](https://docs.go-blueprint.dev/).

## Usage

```bash
nx g @naxodev/gonx:go-blueprint my-go-app
```

The generator will prompt you to select:

- Web framework
- Database driver
- Git handling preference
- Advanced features (optional)

## Options

| Option       | Type    | Default    | Description                                |
| ------------ | ------- | ---------- | ------------------------------------------ |
| directory    | string  | \*required | The directory of the new application       |
| name         | string  | null       | The name of the application                |
| tags         | string  | null       | Add tags to the project (used for linting) |
| skipFormat   | boolean | false      | Skip formatting files                      |
| addGoDotWork | boolean | false      | Add this project to go.work file           |
| framework    | string  | \*required | Web framework to use                       |
| driver       | string  | \*required | Database driver to use                     |
| git          | string  | \*required | Git handling preference                    |
| feature      | array   | []         | Advanced features to include               |

### Framework Options

- `chi` - Chi router
- `gin` - Gin web framework
- `fiber` - Fiber web framework
- `gorilla/mux` - Gorilla Mux router
- `httprouter` - HttpRouter
- `standard-library` - Go standard library
- `echo` - Echo web framework

### Database Driver Options

- `mysql` - MySQL database
- `postgres` - PostgreSQL database
- `sqlite` - SQLite database
- `mongo` - MongoDB
- `redis` - Redis
- `scylla` - ScyllaDB
- `none` - No database

### Git Options

- `commit` - Initialize git and commit changes
- `stage` - Initialize git and stage changes
- `skip` - Skip git initialization

### Advanced Features

- `react` - React frontend integration
- `htmx` - HTMX integration
- `githubaction` - GitHub Actions workflow
- `websocket` - WebSocket support
- `tailwind` - Tailwind CSS
- `docker` - Docker configuration

## Examples

### Basic Usage with Prompts

```bash
nx g @naxodev/gonx:go-blueprint my-api
```

This will prompt you to select all required options interactively.

### Specify All Options

```bash
nx g @naxodev/gonx:go-blueprint my-api \
  --framework=gin \
  --driver=postgres \
  --git=commit \
  --feature=docker,githubaction
```

### Generate in Specific Directory

```bash
nx g @naxodev/gonx:go-blueprint apps/my-api \
  --framework=fiber \
  --driver=mysql \
  --git=stage
```

### Add to Go Workspace

```bash
nx g @naxodev/gonx:go-blueprint my-service \
  --framework=chi \
  --driver=none \
  --git=skip \
  --addGoDotWork=true
```

## Output

The generator creates a fully-featured Go application based on your selections. The exact structure depends on the chosen framework and features, but typically includes:

```
my-go-app/
├── main.go
├── go.mod
├── go.sum
├── handlers/
├── models/
├── database/
├── static/
└── ... (additional files based on selected features)
```

## Integration with Nx

After generation, you can use all standard Nx commands:

```bash
# Build the application
nx build my-go-app

# Run the application
nx serve my-go-app

# Run tests
nx test my-go-app

# Lint the code
nx lint my-go-app

# Manage dependencies
nx tidy my-go-app
```

## Notes

- The generator validates that Go Blueprint is installed before proceeding
- Uses Nx's inferred tasks, so no project.json file is generated
- Follows gonx's philosophy of keeping non-JS monorepos pure
- All Go Blueprint options are mapped to provide a seamless integration experience

## Troubleshooting

### Go Blueprint Not Found

If you see an error about go-blueprint not being found:

1. Ensure Go is installed and configured
2. Install Go Blueprint: `go install github.com/melkeydev/go-blueprint@latest`
3. Verify installation: `go-blueprint version`
4. Make sure `$GOPATH/bin` is in your `$PATH`

### Generation Fails

If generation fails:

1. Check that the target directory doesn't already exist
2. Ensure you have write permissions to the target location
3. Verify all required options are provided
4. Check Go Blueprint documentation for framework-specific requirements
