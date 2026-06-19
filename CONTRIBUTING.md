# Contributing to these OSS projects

🙏 We would ❤️ for you to contribute to these OSS projects and help make them even better than it is today!

## Developing

Start by installing all dependencies:

```bash
bun install
```

Run the tests:

```bash
bunx nx test <project>
bunx nx e2e <project>
```

## Releasing

Each package (`gonx`, `nx-cloudflare`) is released independently and **published manually from a maintainer's machine**. The npm account requires two-factor authentication for writes, so publishing needs a one-time password (OTP) — which is why it runs locally rather than in CI. There is no automated publish workflow; this is the only release path. (`publish-pr.yml` is separate — it publishes throwaway PR previews via OIDC.)

### Before you start

- Push access to `main` and a clean checkout with release tags available: `git fetch --tags`.
- Logged in to npm with publish rights to the `@naxodev` scope, with your authenticator app to hand: `npm login`.

### Steps

1. Sync `main` and fetch tags:

   ```bash
   git switch main && git pull && git fetch --tags
   ```

2. Version, write the changelog, tag, push, and create the GitHub release. Preview with `--dry-run` first:

   ```bash
   bunx nx release --projects=<project> --skip-publish --dry-run
   bunx nx release --projects=<project> --skip-publish
   ```

   This bumps the version from your Conventional Commits, updates the changelog, commits, tags `<project>@vX.Y.Z`, pushes the commit and tag (`release.git.push` is enabled in `nx.json`), and creates the GitHub release. Use the top-level `nx release` — the `nx release version` subcommand is rejected by this repo's `release.git` config.

3. Build so `dist/` carries the new version (publish packs `dist/`, and step 2 leaves it built at the previous version):

   ```bash
   bunx nx build <project>
   ```

4. Publish, entering a fresh OTP from your authenticator:

   ```bash
   bunx nx release publish --projects=<project> --otp=<code>
   ```

### Prereleases

Publish under the `next` dist-tag instead of `latest`:

```bash
bunx nx release publish --projects=<project> --tag next --otp=<code>
```

### Verify

```bash
npm view @naxodev/<package> version          # latest release
npm view @naxodev/<package> dist-tags        # all tags, including next
```

## <a name="rules"></a> Coding Rules

To ensure consistency throughout the source code, keep these rules in mind as you are working:

- All features or bug fixes **must be tested** by one or more specs (unit-tests).
- All public API methods **must be documented**.

## <a name="commit"></a> Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted. This leads to **more
readable messages** that are easy to follow when looking through the **project history**. But also,
we use the git commit messages to **generate the Lumberjack changelog**.

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

Any line of the commit message cannot be longer 100 characters! This allows the message to be easier
to read on GitHub as well as in various git tools.

The footer should contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages/) if any.

Samples: (even more [samples](https://github.com/angular/angular/commits/master))

```
docs(changelog): update changelog to beta.5
```

```
fix(release): need to depend on latest rxjs and zone.js

The version in our package.json gets copied to the one we publish, and users need the latest of these.
```

## Project tags

A project must have the following dimensions.

- Scope
- Type

### Scope

A project is either _internal_ to the workspace or _public_ for external use.

| Scope      | Description                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| `internal` | The project is internal to the workspace and is not intended for external use. |
| `public`   | The project is publicly released and intended for external use.                |

### Type

The following are valid project types in this workspace.

| Type        | Description                                               |
| ----------- | --------------------------------------------------------- |
| `app`       | An application project.                                   |
| `e2e`       | An end-to-end testing project.                            |
| `package`   | A publishable library project released as an npm package. |
| `test-util` | A library project containing internal test utilities.     |
