---
title: Nx Cloudflare Installation
description: How to install and set up Nx Cloudflare in your workspace
---

This guide covers how to install and configure Nx Cloudflare for Cloudflare Workers development.

## Prerequisites

Before installing Nx Cloudflare, ensure you have:

- **Node.js** - Version 18 or later
- **Nx** - Either globally installed or available in your project
- **Cloudflare Account** - For deploying workers (free tier available)

## Installation

Nx Cloudflare can be installed using any package manager:

### Using npm

```bash
npm install @naxodev/nx-cloudflare
```

### Using pnpm

```bash
pnpm add @naxodev/nx-cloudflare
```

### Using yarn

```bash
yarn add @naxodev/nx-cloudflare
```

## Compatibility

Nx Cloudflare maintains compatibility with specific Nx versions:

| Nx Version | Nx Cloudflare Version |
| ---------- | --------------------- |
| 17.x       | 1.x                   |
| 18.x       | 2.x                   |
| 19.x       | 3.x                   |
| 20.x       | 4.x                   |

## Verification

After installation, verify that Nx Cloudflare is working correctly:

### Check Available Generators

```bash
nx list @naxodev/nx-cloudflare
```

This should display all available generators and executors:

- **Generators**: `application`, `library`
- **Executors**: `serve`, `deploy`, `next-build`

### Generate a Test Worker

Create a simple worker to test the installation:

```bash
nx g @naxodev/nx-cloudflare:application test-worker
```

### Serve the Worker Locally

Test local development:

```bash
nx serve test-worker
```

This should start the Wrangler development server.

## Cloudflare Setup

To deploy workers, you'll need to configure Cloudflare credentials.

### Option 1: Wrangler CLI Authentication

The recommended approach is to authenticate using Wrangler:

```bash
npx wrangler auth login
```

This will open a browser window for Cloudflare authentication.

### Option 2: API Token (CI/CD)

For automated deployments, use an API token:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Create a new API token with:
   - **Zone:Zone:Read** permissions
   - **Zone:Worker:Edit** permissions
3. Set the token as an environment variable:

```bash
export CLOUDFLARE_API_TOKEN=your-token-here
```

### Account ID Configuration

Find your Account ID in the Cloudflare dashboard and configure it in your worker projects:

```toml
# wrangler.toml
account_id = "your-account-id-here"
```

Or set it as an environment variable:

```bash
export CLOUDFLARE_ACCOUNT_ID=your-account-id-here
```

## Project Configuration

### Basic Worker Configuration

When you generate a worker, Nx Cloudflare creates a `wrangler.toml` file:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "your-account-id"

[vars]
ENVIRONMENT = "development"
```

### Environment-Specific Configuration

For multiple environments, you can create environment-specific configurations:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "your-account-id"

[env.production]
name = "my-worker-prod"
vars = { ENVIRONMENT = "production" }

[env.staging]
name = "my-worker-staging"
vars = { ENVIRONMENT = "staging" }
```

### Frontend Integration

If you have frontend projects that need to call your workers, configure proxy settings:

```json
{
  "serve": {
    "executor": "@nx/webpack:dev-server",
    "options": {
      "proxyConfig": "proxy.conf.json"
    }
  }
}
```

Create `proxy.conf.json`:

```json
{
  "/api/*": {
    "target": "http://localhost:8787",
    "secure": false,
    "logLevel": "debug"
  }
}
```

## Troubleshooting

### Wrangler Not Found

If you get "wrangler command not found" errors:

1. Install Wrangler globally: `npm install -g wrangler`
2. Or use npx: `npx wrangler --version`
3. Ensure it's in your PATH

### Authentication Issues

If deployment fails with authentication errors:

1. Check if you're logged in: `npx wrangler auth whoami`
2. Re-authenticate: `npx wrangler auth login`
3. Verify your Account ID in `wrangler.toml`

### Build Failures

If builds fail:

1. Ensure TypeScript is properly configured
2. Check that all dependencies are installed
3. Verify `wrangler.toml` configuration

### Port Conflicts

If the development server fails to start:

1. Check if port 8787 is in use
2. Specify a different port: `nx serve my-worker --port 8788`
3. Update proxy configurations accordingly

## IDE Setup

### VS Code

For the best development experience in VS Code:

1. Install the Cloudflare Workers extension
2. Configure TypeScript settings for Worker types
3. Set up debugging configuration

### TypeScript Configuration

Ensure your `tsconfig.json` includes Cloudflare Workers types:

```json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

## Next Steps

Now that Nx Cloudflare is installed and configured:

1. **Create your first worker**: Follow the [Workers guide](/nx-cloudflare/workers/)
2. **Build libraries**: Learn about [worker libraries](/nx-cloudflare/libraries/)
3. **Deploy to production**: Set up your deployment pipeline
4. **Explore examples**: Check out example projects in the workspace

Ready to build amazing serverless applications! 🌥️
