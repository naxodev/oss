# Go-Blueprint Schema Update Script

This script automatically updates the go-blueprint generator schema by parsing the actual go-blueprint CLI help output.

## Usage

```bash
node update-schema.js
```

## What it does

1. **Fetches CLI options**: Runs `go-blueprint create --help` to get current options
2. **Parses options**: Extracts flags, descriptions, and allowed values dynamically
3. **Merges with base schema**: Combines go-blueprint options with Nx-specific options
4. **Updates schema files**:
   - `schema.json` - JSON schema with full option definitions
   - `schema.d.ts` - TypeScript type definitions

## When to run

- Before releasing a new version of gonx to match a newer go-blueprint version
- When go-blueprint adds, removes, or changes CLI options
- To ensure the generator schema stays in sync with go-blueprint capabilities

## Output

The script discovers and maps:

- `driver` - Database driver selection with enum values (required)
- `feature` - Array of advanced features (multiselect, optional)
- `framework` - Web framework selection with enum values (required)
- `git` - Git handling options with enum values (required)
- `name` - Project name (string, optional - uses Nx project name)

Note: The `advanced` flag is intentionally skipped since it's handled internally when features are selected. The `name` field is optional since it uses the same name as the Nx project. Essential options are marked as required to prevent go-blueprint's TUI from appearing.

Plus Nx-specific options:

- `directory` - Target directory (required)
- `tags` - Project tags
- `skipFormat` - Skip formatting
- `addGoDotWork` - Add to go.work file
