---
title: Quick Start
description: Get up and running with OSS workspace plugins
---

This guide will help you get started with the OSS workspace plugins quickly. Choose the plugin that best fits your needs.

## Prerequisites

Before getting started, ensure you have:

- **Node.js** (version 18 or later)
- **npm**, **pnpm**, or **yarn** package manager
- **Nx CLI** (`npm install -g nx` or `npm install -g @nx/cli`)

For GoNx specifically:

- **Go** ([stable version](https://go.dev/dl/)) installed on your machine

## Choose Your Path

### Option 1: Create a New Workspace with GoNx

If you want to start a new workspace focused on Go development:

```bash
npx create-nx-workspace go-workspace --preset=@naxodev/gonx
```

This will create a new Nx workspace pre-configured with GoNx.

### Option 2: Add to Existing Workspace

If you have an existing Nx workspace and want to add our plugins:

#### Add GoNx

```bash
nx add @naxodev/gonx
```

#### Add Nx Cloudflare

```bash
# Using npm
npm install @naxodev/nx-cloudflare

# Using pnpm
pnpm add @naxodev/nx-cloudflare

# Using yarn
yarn add @naxodev/nx-cloudflare
```

## Your First Project

### Create a Go Application

```bash
nx g @naxodev/gonx:application my-go-app
```

### Create a Go Library

```bash
nx g @naxodev/gonx:library my-go-lib
```

### Create a Cloudflare Worker

```bash
nx g @naxodev/nx-cloudflare:application my-worker
```

### Create a Cloudflare Worker Library

```bash
nx g @naxodev/nx-cloudflare:library my-worker-lib
```

## Common Commands

Once you have projects set up, here are the most common commands you'll use:

### Building Projects

```bash
# Build a Go application
nx build my-go-app

# Build a Cloudflare Worker
nx build my-worker
```

### Running Projects

```bash
# Run a Go application
nx serve my-go-app

# Serve a Cloudflare Worker locally
nx serve my-worker
```

### Testing Projects

```bash
# Test a Go project
nx test my-go-app

# Test a Cloudflare Worker
nx test my-worker
```

### Deploying to Cloudflare

```bash
# Deploy a Cloudflare Worker
nx deploy my-worker
```

## Next Steps

Now that you have a basic setup:

1. **Explore the specific documentation** for your chosen plugin:

   - [GoNx Documentation](/gonx/overview/)
   - [Nx Cloudflare Documentation](/nx-cloudflare/overview/)

2. **Check out examples** in the workspace's `examples/` directory

3. **Join the community** on [Discord](https://discord.gg/zjDCGpKP2S) for tips and support

4. **Read about compatibility** in our [compatibility guide](/reference/compatibility/)

Happy coding! 🎉
