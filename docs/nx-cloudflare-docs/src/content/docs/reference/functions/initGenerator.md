---
editUrl: false
next: false
prev: false
title: "initGenerator"
---

> **initGenerator**(`tree`, `schema`): `Promise`\<() => `Promise`\<`void`\>\>

Defined in: [packages/nx-cloudflare/src/generators/init/generator.ts:22](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/init/generator.ts#L22)

Initializes the @naxodev/nx-cloudflare plugin in a workspace: installs the
required runtime dependencies and registers the inference plugin in nx.json.

## Parameters

### tree

`Tree`

### schema

[`InitGeneratorSchema`](/reference/interfaces/initgeneratorschema/)

## Returns

`Promise`\<() => `Promise`\<`void`\>\>
