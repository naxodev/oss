# Contributing to these OSS projects

🙏 We would ❤️ for you to contribute to these OSS projects and help make them even better than they are today!

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

Each package (`gonx`, `nx-cloudflare`) is released independently. **Versioning, changelog, tagging, and the GitHub release happen locally**; **publishing happens in CI** (`.github/workflows/publish.yml`) via npm OIDC trusted publishing, which emits provenance attestations automatically. There is no local production publish path anymore (see [Fallback](#fallback) if OIDC is unavailable).

### Before you start

- Push access to `main` and a clean checkout with release tags available: `git fetch --tags`.
- npm login is **not** required to release — only for one-off dist-tag maintenance (see [Dist-tag hygiene](#dist-tag-hygiene)).

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

   Note on versioning both manifests: `release.version.preVersionCommand` builds every project first, then `release.version.manifestRootsToUpdate` (`["{projectRoot}", "dist/{projectRoot}"]`) writes the bumped version into **both** the source and `dist/` `package.json`. Without that `manifestRootsToUpdate`, versioning updated only the source manifest, so publish packed a **stale `dist/` at the old version** — `npm` silently re-tagged the already-published version instead of erroring. CI re-builds from the tagged commit and re-asserts the dist version matches the tag, but the dual-manifest write still matters for local dry-runs and for understanding the historical failure mode.

3. The pushed tag triggers the `publish-production` job in `.github/workflows/publish.yml`. Approve the `production` environment gate when GitHub prompts you. CI checks out the tag, builds the package, asserts both the source and dist manifests match the tag version, and publishes `dist/packages/<project>` tokenlessly via OIDC (provenance is automatic).

### Prereleases

Any version containing `-` (e.g. `5.0.0-beta.1`) is published under the `next` dist-tag automatically; stable versions go to `latest`. No extra flags are needed — CI derives the dist-tag from the version string.

### Back-patch warning

CI maps every non-prerelease to `latest` — publishing a patch of an **older major** (e.g. `gonx@4.0.3` after `5.0.0` shipped) will move `latest` backwards, so after a back-patch a maintainer must re-point it manually: `npm dist-tag add @naxodev/<package>@<newest-version> latest --otp=<code>`.

### Re-running / manual publish of an existing tag

```bash
gh workflow run publish.yml -f tag=<project>@vX.Y.Z
```

Or use the Actions UI. The job is idempotent — if the version is already live it succeeds without republishing.

### Verify

```bash
npm view @naxodev/<package> version          # latest release
npm view @naxodev/<package> dist-tags        # all tags, including next
npm view @naxodev/<package>@<version> --json | jq .dist.attestations
```

Non-null attestations means provenance is present; the package page on npmjs.com also shows the provenance badge.

### Trusted publisher (one-time npm setup)

Each package's npmjs.com settings must point Trusted Publisher at repository `naxodev/oss`, workflow **`publish.yml`**, with the environment field **left blank** (the preview job runs without an environment; a single trusted-publisher entry covers both jobs). After this workflow lands, publishes fail loudly with an OIDC error until the Trusted Publisher entry is updated from the previous `publish-pr.yml` filename.

Also create a GitHub Environment named `production` (repo Settings → Environments) and add yourself as a required reviewer to gate production publishes.

### Dist-tag hygiene

Stale `next` tags should be pruned after a stable release supersedes them:

```bash
npm dist-tag rm @naxodev/<package> next --otp=<code>
```

Never automate tag deletion in CI.

### Fallback

If OIDC publishing is unavailable, a local `bunx nx release publish --projects=<project> --otp=<code>` still works but ships **without provenance** — last resort only.

## <a name="rules"></a> Coding Rules

To ensure consistency throughout the source code, keep these rules in mind as you are working:

- All features or bug fixes **must be tested** by one or more specs (unit-tests).
- All public API methods **must be documented**.

## <a name="commit"></a> Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted. This leads to **more
readable messages** that are easy to follow when looking through the **project history**. But also,
we use the git commit messages to **generate the changelog**.

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
