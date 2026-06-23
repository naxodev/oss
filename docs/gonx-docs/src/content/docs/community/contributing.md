---
title: Contributing
description: How to contribute to @naxodev/gonx.
---

gonx is MIT licensed and developed on
[GitHub](https://github.com/naxodev/oss/tree/main/packages/gonx). Bug reports,
feature requests, and pull requests are all welcome.

## Development setup

This repo is a [bun](https://bun.sh/) workspace with Nx. Clone it and install
dependencies:

```bash
git clone https://github.com/naxodev/oss.git
cd oss
bun install
```

You need:

- **Node.js 22+**
- **bun** (package manager)
- **Go** — a stable release (for running e2e tests)

## Running tests

Unit tests run on `bun test`. Run a single spec directly:

```bash
cd packages/gonx && bun test src/graph/static-analysis/parse-go-mod.spec.ts
```

Or run the whole project through Nx (each spec runs in its own bun process for
mock isolation):

```bash
bunx nx test gonx
```

End-to-end tests spin up a local Verdaccio registry and install the published
tarball into a generated workspace:

```bash
bunx nx e2e gonx-e2e
```

## Linting and formatting

```bash
bunx nx lint gonx
bunx nx format:check
bunx nx format:write
```

## Opening a pull request

1. Create a branch from `main`.
2. Make your changes, keeping commits focused.
3. Run lint, tests, and build before pushing:

   ```bash
   bunx nx affected -t lint test build
   ```

4. Open a PR with a clear description.

### Commit messages

Commits are validated by **commitlint** using Conventional Commits. Use the
package scope:

```
feat(gonx): add new generator option
fix(gonx): resolve import edge case
docs(gonx): update executor reference
```

PR titles matter — squash-merge lands the PR title as the commit subject. Use
`feat(gonx)!: ...` for breaking changes.

### Coding rules

- All features or bug fixes must be covered by one or more unit tests.
- All public API methods must be documented.

## Releasing

Releases are independent per project and published manually from a maintainer's
machine (the npm account requires 2FA for writes). See
[CONTRIBUTING.md](https://github.com/naxodev/oss/blob/main/CONTRIBUTING.md) for
the full release workflow.

## Next steps

- [How static analysis works](/understanding/static-analysis) — understand the tree-sitter graph
- [Plugin options](/guides/generators/options) — the plugin's configuration surface
- [Quick start](/getting-started/quick-start) — get familiar with gonx as a user
