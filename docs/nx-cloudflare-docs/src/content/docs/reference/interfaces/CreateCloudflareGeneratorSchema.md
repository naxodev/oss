---
editUrl: false
next: false
prev: false
title: "CreateCloudflareGeneratorSchema"
---

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:4](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L4)

## Properties

### c3Args?

> `optional` **c3Args?**: `string`[]

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:20](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L20)

Raw passthrough flags for create-cloudflare.

***

### c3Version?

> `optional` **c3Version?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:18](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L18)

Override the pinned create-cloudflare version.

***

### directory

> **directory**: `string`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:6](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L6)

The directory of the new application.

***

### framework?

> `optional` **framework?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:12](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L12)

Web framework, forwarded to C3 `--framework`.

***

### lang?

> `optional` **lang?**: `C3Lang`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:16](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L16)

Language of the generated scaffold, forwarded to C3 `--lang`.

***

### name?

> `optional` **name?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:8](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L8)

The name of the application.

***

### skipFormat?

> `optional` **skipFormat?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:24](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L24)

Skip formatting files.

***

### tags?

> `optional` **tags?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:22](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L22)

Add tags to the application (used for linting).

***

### template?

> `optional` **template?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:14](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L14)

Remote git template, forwarded to C3 `--template`.

***

### type?

> `optional` **type?**: `string`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:10](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L10)

Worker template, forwarded to C3 `--type`.

***

### useProjectJson?

> `optional` **useProjectJson?**: `boolean`

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts:26](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/schema.d.ts#L26)

Write an explicit project.json instead of relying on target inference.
