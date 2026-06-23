---
editUrl: false
next: false
prev: false
title: "NxCloudflareLibraryGeneratorSchema"
---

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:5](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L5)

## Properties

### bundler?

> `optional` **bundler?**: `Bundler`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:35](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L35)

The bundler to use. Choosing 'none' means this library is not buildable.

***

### config?

> `optional` **config?**: `"workspace"` \| `"project"` \| `"npm-scripts"`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:33](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L33)

Determines whether the project's executors should be configured in `workspace.json`, `project.json` or as npm scripts.

***

### directory

> **directory**: `string`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:7](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L7)

The directory of the new library.

***

### importPath?

> `optional` **importPath?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:29](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L29)

The library name used to import it, like @myorg/my-awesome-lib. Required for publishable library.

***

### js?

> `optional` **js?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:23](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L23)

Generate JavaScript files rather than TypeScript files.

***

### linter?

> `optional` **linter?**: `Linter`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:13](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L13)

The tool to use for running lint checks.

***

### minimal?

> `optional` **minimal?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:39](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L39)

Generate a library with a minimal setup. No README.md generated.

***

### name?

> `optional` **name?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:9](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L9)

The name of the library.

***

### publishable?

> `optional` **publishable?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:27](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L27)

Generate a publishable library.

***

### rootProject?

> `optional` **rootProject?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:41](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L41)

Whether the library is generated as the workspace root project.

***

### setParserOptionsProject?

> `optional` **setParserOptionsProject?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:31](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L31)

Whether or not to configure the ESLint `parserOptions.project` option.

***

### simpleName?

> `optional` **simpleName?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:43](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L43)

Don't include the directory in the generated file name.

***

### skipFormat?

> `optional` **skipFormat?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:11](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L11)

Skip formatting files.

***

### skipPackageJson?

> `optional` **skipPackageJson?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:19](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L19)

Do not add dependencies to `package.json`.

***

### skipTsConfig?

> `optional` **skipTsConfig?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:17](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L17)

Do not update tsconfig.json for development experience.

***

### skipTypeCheck?

> `optional` **skipTypeCheck?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:37](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L37)

Whether to skip TypeScript type checking for SWC compiler.

***

### strict?

> `optional` **strict?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:25](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L25)

Whether to enable tsconfig strict mode or not.

***

### tags?

> `optional` **tags?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:15](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L15)

Add tags to the library (used for linting).

***

### unitTestRunner?

> `optional` **unitTestRunner?**: `"none"` \| `"vitest"`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:21](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L21)

Test runner to use for unit tests.

***

### useProjectJson?

> `optional` **useProjectJson?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/library/schema.d.ts:45](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/schema.d.ts#L45)

Write an explicit project.json instead of relying on target inference.
