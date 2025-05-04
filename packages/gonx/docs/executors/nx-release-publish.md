# Nx-Release-Publish Executor

Lists the module in the Golang registry.

## Usage

```bash
nx nx-release-publish my-go-lib
```

or through the `nx release` command:

```bash
nx release --publish
```

## Options

The nx-release-publish executor does not have configurable options. It automatically publishes your Go module to the Go registry.

## Default Inferred

```json
{
    executor: '@naxodev/gonx:release-publish',
    options: {
      moduleRoot: projectRoot,
    },
    configurations: {
      development: {
        dryRun: true,
      },
    },
  }
```

## Notes

- This executor is designed to work seamlessly with `nx release`
- Publishes your Go module to the Go registry
- Part of gonx's integration with Nx's version management system
