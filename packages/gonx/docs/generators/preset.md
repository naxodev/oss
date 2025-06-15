# Preset Generator

Preset generator for creating a new workspace with gonx pre-configured.

## Usage

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

## Options

The preset generator inherits options from the Nx workspace creation process.

## Example

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

## Notes

- Creates a new Nx workspace with gonx pre-configured
- Sets up the workspace with Go support
- Ready to use immediately for Go development
- Creates go.work file only when explicitly requested via the `addGoDotWork` option
- Includes all necessary configuration for the Go toolchain
