---
title: Nx Cloudflare Overview
description: Nx plugin for Cloudflare development, featuring Workers, Pages, and Next.js integration
---

import { Card, CardGrid } from '@astrojs/starlight/components';

Nx Cloudflare is a comprehensive Nx plugin designed for Cloudflare development, particularly focused on Cloudflare Workers with additional support for Pages and Next.js integration.

## Key Features

<CardGrid>
	<Card title="Cloudflare Workers" icon="rocket">
		Generate Worker applications with Fetch Handler, Scheduled Handler, or Hono templates.
	</Card>
	<Card title="Worker Libraries" icon="puzzle">
		Create reusable libraries for Cloudflare Worker development.
	</Card>
	<Card title="Development Tools" icon="laptop">
		Serve and deploy executors with full Wrangler CLI integration.
	</Card>
	<Card title="Next.js Support" icon="star">
		Experimental Cloudflare Pages builder for Next.js projects.
	</Card>
</CardGrid>

## Supported Templates

### Worker Templates

- **Fetch Handler** - Standard HTTP request/response handling
- **Scheduled Handler** - Cron-triggered workers for background tasks
- **Hono** - Modern web framework for Cloudflare Workers
- **None** - Blank template for custom setups

### Testing & Development

- **Vitest Integration** - Modern testing framework support
- **Local Development** - Full Wrangler dev server integration
- **Hot Reload** - Fast development iteration

## Core Capabilities

### Generate Applications
Create Cloudflare Worker applications with various templates and configurations:

```bash
nx g @naxodev/nx-cloudflare:application my-worker-app
```

### Generate Libraries
Build reusable Worker libraries for shared functionality:

```bash
nx g @naxodev/nx-cloudflare:library my-worker-lib
```

### Local Development
Serve workers locally with full Cloudflare environment simulation:

```bash
nx serve my-worker-app
```

### Deployment
Deploy workers directly to Cloudflare from your Nx workspace:

```bash
nx deploy my-worker-app
```

## Wrangler Integration

Nx Cloudflare leverages the official Wrangler CLI for all Cloudflare operations, ensuring:

- **Full compatibility** with Cloudflare's tooling
- **Latest features** as soon as Cloudflare releases them
- **Reliable deployments** using battle-tested tools
- **Seamless configuration** through `wrangler.toml`

## Development Workflow

1. **Generate** - Create workers and libraries using Nx generators
2. **Develop** - Use local development server with hot reload
3. **Test** - Run Vitest tests with Nx caching
4. **Build** - Bundle workers for production deployment
5. **Deploy** - Push to Cloudflare with environment-specific configuration

## Next.js on Cloudflare (Experimental)

:::caution[Experimental Feature]
The Next.js on Cloudflare feature is experimental. We appreciate feedback on any issues you encounter.
:::

Nx Cloudflare includes experimental support for deploying Next.js applications to Cloudflare Pages:

```json
{
  "targets": {
    "build": {
      "executor": "@naxodev/nx-cloudflare:next-build"
    }
  }
}
```

This feature enables:
- Server-side rendering on Cloudflare Pages
- Edge runtime optimization
- Automatic asset optimization
- Seamless deployment workflow

## Architecture Benefits

### Monorepo Advantages
- **Shared libraries** across multiple workers
- **Consistent tooling** and configuration
- **Dependency management** with proper caching
- **Code sharing** between frontend and worker code

### Nx Integration
- **Task caching** for faster builds and tests
- **Project graph** visualization of worker dependencies
- **Parallel execution** of worker operations
- **Affected commands** for efficient CI/CD

## Getting Started

Ready to start building with Cloudflare Workers? Check out:

- [Installation Guide](/nx-cloudflare/installation/) - Set up Nx Cloudflare in your workspace
- [Workers Guide](/nx-cloudflare/workers/) - Create and deploy your first worker
- [Libraries Guide](/nx-cloudflare/libraries/) - Build reusable worker libraries
- [Next.js Guide](/nx-cloudflare/nextjs/) - Deploy Next.js to Cloudflare Pages

## Community & Support

- **Discord**: Join our [Discord server](https://discord.gg/zjDCGpKP2S) for community support
- **GitHub**: Contribute to the [open source project](https://github.com/abelpenton/oss)
- **Documentation**: Comprehensive guides and API reference
- **Examples**: Real-world examples in the workspace

Transform your serverless development with the power of Nx and Cloudflare! 🚀
