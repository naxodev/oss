---
title: Introduction
description: What is Nx Cloudflare and what can it do for you?
---

`@naxodev/nx-cloudflare` is an Nx plugin for [Cloudflare Workers](https://developers.cloudflare.com/workers/).
It brings Workers into an Nx workspace so you can scaffold, serve, deploy, and
maintain Worker projects alongside the rest of your monorepo — with the caching,
affected-detection, and project graph that Nx provides.

The plugin infers Worker lifecycle targets (`serve`, `deploy`, `typegen`,
`version-upload`, `tail`) directly from each project's Wrangler config, so there
are no hand-written `project.json` targets to maintain. Scaffolding is handled
by generators that wrap Cloudflare's [create-cloudflare (C3)](https://developers.cloudflare.com/workers/get-started/create-worker/)
CLI, producing Nx-ready projects with `wrangler.jsonc`, TypeScript, and Vitest
pre-configured.

It's for teams and individuals already using Nx who want first-class Cloudflare
Workers support in their workspace — whether that's a single Worker or a fleet
of them shared across libraries, bindings, and shared logic.

## Where to go next

- New to the plugin? Walk through the [Quick start](/getting-started/quick-start)
  to create, serve, and deploy a Worker in a few minutes.
- Already know what you need? See [Installation](/getting-started/installation)
  to add the plugin to an existing workspace.
