# Go Blueprint Generator

Uses [Go Blueprint](https://github.com/Melkeydev/go-blueprint) to generate Go applications with various frameworks and features. This generator integrates Go Blueprint's powerful scaffolding capabilities with Nx's workflow.

The Go Blueprint binary is included with this package, so no additional installation is required.

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

- `react` - React frontend integration (⚠️ **Not recommended** - see Frontend Integration below)
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

## Frontend Integration

⚠️ **Important**: Avoid using Go Blueprint's built-in frontend features (like `react`) as they will not be properly detected by Nx's project graph. Since Nx already detects a Go project in the directory, adding frontend code directly will create conflicts.

### Recommended Approach

Instead of using Go Blueprint's frontend features, create separate frontend projects using Nx's native generators:

```bash
# Generate your Go API first
nx g @naxodev/gonx:go-blueprint my-api --framework=gin --driver=postgres --git=skip

# Then generate a separate frontend project
nx g @nx/react:app frontend --directory=apps/frontend

# Or use other Nx frontend generators
nx g @nx/angular:app frontend --directory=apps/frontend
nx g @nx/vue:app frontend --directory=apps/frontend
```

### Benefits of Separate Projects

- ✅ Proper Nx project graph detection and dependency tracking
- ✅ Independent build, test, and deployment pipelines
- ✅ Better separation of concerns
- ✅ Full access to Nx's frontend tooling and optimizations
- ✅ Easier to scale and maintain

### Example Workspace Structure

```
my-workspace/
├── apps/
│   ├── my-api/           # Go API (generated with go-blueprint)
│   │   ├── main.go
│   │   └── go.mod
│   └── frontend/         # React/Angular/Vue app (generated with Nx)
│       ├── src/
│       └── package.json
└── nx.json
```

## Notes

- Go Blueprint binary is bundled with this package
- Uses Nx's inferred tasks, so no project.json file is generated
- Follows gonx's philosophy of keeping non-JS monorepos pure
- All Go Blueprint options are mapped to provide a seamless integration experience

## Troubleshooting

### Generation Fails

If generation fails:

1. Check that the target directory doesn't already exist
2. Ensure you have write permissions to the target location
3. Verify all required options are provided
4. Check [Go Blueprint documentation](https://docs.go-blueprint.dev/) for framework-specific requirements
