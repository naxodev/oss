# Convert-to-One-Mod Generator

Converts a multi-module Go workspace to a single-module configuration.

## Usage

```bash
nx g @naxodev/gonx:convert-to-one-mod
```

## Options

This generator does not have configurable options.

## Example

```bash
nx g @naxodev/gonx:convert-to-one-mod
```

## Notes

- By default, gonx uses a multi-module Go workspace configuration
- This generator allows you to switch to a single-module approach if preferred
- After conversion, generators will adapt to the single-module configuration
- Use this if you prefer a more traditional Go project setup
- This is a one-way operation (you would need to reinstall gonx to switch back)
