---
editUrl: false
next: false
prev: false
title: "createCloudflareGenerator"
---

> **createCloudflareGenerator**(`tree`, `schema`): `Promise`\<`GeneratorCallback`\>

Defined in: [packages/nx-cloudflare/src/generators/create-cloudflare/generator.ts:39](https://github.com/naxodev/oss/blob/main/packages/nx-cloudflare/src/generators/create-cloudflare/generator.ts#L39)

Scaffolds a Cloudflare Worker application by delegating to Cloudflare's
create-cloudflare (C3) CLI, then imports the result into the Nx workspace and
wires it up (Wrangler target inference, workspace-managed dependencies).

## Parameters

### tree

`Tree`

### schema

[`CreateCloudflareGeneratorSchema`](/reference/interfaces/createcloudflaregeneratorschema/)

## Returns

`Promise`\<`GeneratorCallback`\>
