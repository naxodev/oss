---
editUrl: false
next: false
prev: false
title: "libraryGenerator"
---

> **libraryGenerator**(`tree`, `schema`): `Promise`\<() => `Promise`\<`void`\>\>

Defined in: [packages/nx-cloudflare/src/generators/library/generator.ts:38](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/library/generator.ts#L38)

Generates a Cloudflare Workers library project, building on the `@nx/js`
library generator and registering the plugin's required dependencies.

## Parameters

### tree

`Tree`

### schema

[`NxCloudflareLibraryGeneratorSchema`](/reference/interfaces/nxcloudflarelibrarygeneratorschema/)

## Returns

`Promise`\<() => `Promise`\<`void`\>\>
