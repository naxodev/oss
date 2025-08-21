---
title: Application Generator
description: Generates a Go application with a well-structured foundation
---

## Usage

```bash
nx g @naxodev/gonx:application my-go-app
```

## Options

| Option     | Type                         | Default    | Description                                    |
| ---------- | ---------------------------- | ---------- | ---------------------------------------------- |
| name       | string                       | null       | Name of the Go application                     |
| directory  | string                       | \*required | The directory of the new application           |
| template   | `standard` \| `cli` \| `tui` | `standard` | The template of application to generate        |
| tags       | string                       | null       | Add tags to the application (used for linting) |
| skipFormat | boolean                      | false      | Skip formatting files                          |

## Examples

### Generate a standard application (default)

```bash
nx g @naxodev/gonx:application my-go-app
```

### Generate a CLI application

```bash
nx g @naxodev/gonx:application my-cli-app --template=cli
```

### Generate a TUI application

```bash
nx g @naxodev/gonx:application my-tui-app --template=tui
```

### Generate an application in a specific directory

```bash
nx g @naxodev/gonx:application apps/my-go-app
```

or

```bash
nx g @naxodev/gonx:application --name=go-app --directory=apps/my-go-app
```

### Generate an application with tags

> [!NOTE]
> Tags will only work when the project was created with a project.json file

```bash
nx g @naxodev/gonx:application my-go-app --tags="json yaml"
```

## Output

The generator creates different structures based on the application template:

### Standard Application (default)

```
my-go-app/
├── main.go
├── main_test.go
└── go.mod
```

### CLI Application (--template=cli)

```
my-cli-app/
├── main.go
├── main_test.go
├── go.mod
└── internal/
    └── cmd/
        ├── root.go
        ├── version.go
        └── cmd_test.go
```

### TUI Application (--template=tui)

```
my-tui-app/
├── main.go
├── main_test.go
├── go.mod
└── internal/
    ├── cmd/
    │   └── root.go
    └── ui/
        ├── model.go
        ├── view.go
        ├── styles.go
        └── ui_test.go
```

## Notes

- Unlike the original nx-go, gonx does not generate a project.json file
- Uses inferred tasks, so you can immediately use `nx build`, `nx serve`, etc.
- **CLI applications** use [Cobra](https://github.com/spf13/cobra) for professional command-line interfaces
- **TUI applications** use [Bubble Tea](https://github.com/charmbracelet/bubbletea) and [Lipgloss](https://github.com/charmbracelet/lipgloss) for interactive terminal UIs
- For CLI and TUI apps, run `nx tidy <app-name>` after generation to download dependencies
