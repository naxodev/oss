---
title: Application Generator
description: Generates a Go application with a well-structured foundation
---

## Usage

```bash
nx g @naxodev/gonx:application my-go-app
```

## Options

| Option     | Type    | Default    | Description                                    |
| ---------- | ------- | ---------- | ---------------------------------------------- |
| name       | string  | null       | Name of the Go application                     |
| directory  | string  | \*required | The directory of the new application           |
| tags       | string  | null       | Add tags to the application (used for linting) |
| skipFormat | boolean | false      | Skip formatting files                          |

## Examples

### Generate an application in the root

```bash
nx g @naxodev/gonx:application my-go-app
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

The generator creates a Go application with the following structure:

```
my-go-app/
 ── main.go
├── go.mod
├── go.sum
```

## Notes

- Unlike the original nx-go, gonx does not generate a project.json file
- Uses inferred tasks, so you can immediately use `nx build`, `nx serve`, etc.
