# Contributing to these OSS projects

🙏 We would ❤️ for you to contribute to these OSS projects and help make them even better than it is today!

## Developing

Start by installing all dependencies:

```bash
pnpm
```

Run the tests:

```bash
pnpm nx test <project>
pnpm nx e2e <project>
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
