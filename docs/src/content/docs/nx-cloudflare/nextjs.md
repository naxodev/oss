---
title: Next.js on Cloudflare
description: Deploy Next.js applications to Cloudflare Pages using Nx Cloudflare
---

:::caution[Experimental Feature]
The Next.js on Cloudflare feature is experimental. We appreciate feedback on any issues you encounter.
:::

This guide covers deploying Next.js applications to Cloudflare Pages using the experimental Nx Cloudflare Next.js builder.

## Overview

The Nx Cloudflare Next.js builder enables you to deploy Next.js applications to Cloudflare Pages with:

- **Server-side rendering** on Cloudflare's edge network
- **Edge runtime optimization** for fast global performance
- **Automatic asset optimization** and caching
- **Seamless deployment workflow** integrated with Nx

## Setup

### Prerequisites

Before using the Next.js builder, ensure you have:

- **Next.js application** in your Nx workspace
- **Cloudflare account** with Pages enabled
- **Nx Cloudflare plugin** installed

### Configure the Builder

Replace the default Next.js builder in your application's `project.json`:

```json
{
  "name": "my-next-app",
  "targets": {
    "build": {
      "executor": "@naxodev/nx-cloudflare:next-build",
      "options": {
        "outputPath": "dist/apps/my-next-app",
        "buildLibsFromSource": true
      }
    }
  }
}
```

### Builder Options

The Cloudflare Next.js builder supports the same options as `@nx/next:build`:

| Option                                | Type     | Default | Description                          |
| ------------------------------------- | -------- | ------- | ------------------------------------ |
| `outputPath`                          | string   | -       | Output directory for build artifacts |
| `buildLibsFromSource`                 | boolean  | `true`  | Build libraries from source          |
| `fileReplacements`                    | object[] | -       | File replacement patterns            |
| `generateLockfile`                    | boolean  | `false` | Generate lockfile                    |
| `includeDevDependenciesInPackageJson` | boolean  | `false` | Include dev dependencies             |
| `nextConfig`                          | string   | -       | Path to Next.js config file          |
| `profile`                             | boolean  | `false` | Enable profiling                     |
| `debug`                               | boolean  | `false` | Enable debug mode                    |

## Next.js Configuration

### Cloudflare Pages Configuration

Create or update `next.config.js` for Cloudflare compatibility:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for some pages
  trailingSlash: true,

  // Configure images for Cloudflare
  images: {
    unoptimized: true,
  },

  // Optimize for edge runtime
  experimental: {
    runtime: 'edge',
  },

  // Configure for Cloudflare Pages
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

### Edge Runtime Configuration

For API routes compatible with Cloudflare:

```typescript
// pages/api/hello.ts or app/api/hello/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default function handler(req: NextRequest) {
  return NextResponse.json({
    message: 'Hello from Cloudflare Edge!',
    timestamp: new Date().toISOString(),
  });
}
```

### Environment Variables

Configure environment variables for Cloudflare Pages:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // For build-time variables
  publicRuntimeConfig: {
    apiUrl: process.env.API_URL,
  },
};

module.exports = nextConfig;
```

## Building Applications

### Build for Cloudflare

```bash
nx build my-next-app
```

This command:

1. **Processes Next.js application** with Cloudflare optimizations
2. **Generates static assets** optimized for edge delivery
3. **Creates Functions** for server-side rendering
4. **Bundles edge-compatible code** for Cloudflare Workers runtime
5. **Outputs deployment-ready artifacts** in the specified directory

### Build Output Structure

The build generates a structure compatible with Cloudflare Pages:

```
dist/apps/my-next-app/
├── _next/                 # Static assets
│   ├── static/
│   └── ...
├── functions/             # API routes as Functions
│   └── api/
│       └── [...].js
├── public/               # Public assets
└── index.html           # Static pages
```

## Deployment

### Manual Deployment

Deploy the built application to Cloudflare Pages:

1. **Build the application**:

   ```bash
   nx build my-next-app
   ```

2. **Deploy using Wrangler**:
   ```bash
   npx wrangler pages deploy dist/apps/my-next-app
   ```

### CI/CD Deployment

Configure automated deployment in your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: nx build my-next-app

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-next-app
          directory: dist/apps/my-next-app
```

### Configuration for Deployment

Create `wrangler.toml` for Pages configuration:

```toml
name = "my-next-app"
compatibility_date = "2024-01-01"

[env.production]
name = "my-next-app-prod"
vars = { NODE_ENV = "production" }

[env.staging]
name = "my-next-app-staging"
vars = { NODE_ENV = "staging" }
```

## Features and Limitations

### Supported Features

✅ **Static Site Generation (SSG)**

✅ **Server-Side Rendering (SSR)** with edge runtime

✅ **API Routes** as Cloudflare Functions

✅ **Dynamic imports** and code splitting

✅ **Image optimization** (with configuration)

✅ **Environment variables**

✅ **Custom domains** and SSL

✅ **Global CDN** distribution

### Current Limitations

⚠️ **Node.js APIs** - Limited to edge-compatible APIs only

⚠️ **File system access** - Not available in edge runtime

⚠️ **Some Next.js features** - Check compatibility with edge runtime

⚠️ **Third-party packages** - Must be edge-compatible

### Edge Runtime Compatibility

Ensure your code is compatible with the edge runtime:

```typescript
// ✅ Good - Edge compatible
export default function handler(req: NextRequest) {
  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent');

  return NextResponse.json({
    path: url.pathname,
    userAgent,
  });
}

// ❌ Bad - Node.js specific
import fs from 'fs';

export default function handler(req: NextRequest) {
  const data = fs.readFileSync('./data.json'); // Won't work
  return NextResponse.json({ data });
}
```

## Performance Optimization

### Caching Strategy

Configure caching headers for optimal performance:

```typescript
// app/api/data/route.ts
export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
```

### Asset Optimization

Optimize static assets:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compress assets
  compress: true,

  // Optimize images
  images: {
    unoptimized: false,
    domains: ['example.com'],
  },

  // Enable experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['package-name'],
  },
};

module.exports = nextConfig;
```

### Code Splitting

Use dynamic imports for code splitting:

```typescript
// components/DynamicComponent.tsx
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});

export default DynamicComponent;
```

## Troubleshooting

### Common Issues

**Build fails with "Module not found"**

- Check that all dependencies are edge-compatible
- Verify import paths and module resolution
- Use dynamic imports for problematic modules

**Runtime errors in production**

- Test with edge runtime locally
- Check for Node.js-specific APIs
- Verify environment variable configuration

**Performance issues**

- Review caching strategies
- Optimize asset loading
- Check for blocking operations

### Debug Mode

Enable debug mode for troubleshooting:

```bash
nx build my-next-app --debug
```

### Local Testing

Test edge runtime locally:

```bash
# Start development server with edge runtime
npm run dev

# Or test specific API routes
curl http://localhost:3000/api/test
```

## Migration from Standard Next.js

### Step 1: Update Builder

Replace the standard Next.js builder:

```json
{
  "targets": {
    "build": {
      "executor": "@naxodev/nx-cloudflare:next-build"
    }
  }
}
```

### Step 2: Update Configuration

Modify `next.config.js` for Cloudflare compatibility.

### Step 3: Review API Routes

Ensure API routes use edge-compatible code:

```typescript
// Before - Node.js specific
import { promises as fs } from 'fs';

export default async function handler(req, res) {
  const data = await fs.readFile('./data.json');
  res.json(JSON.parse(data.toString()));
}

// After - Edge compatible
export const config = { runtime: 'edge' };

export default function handler(req: NextRequest) {
  // Use external APIs or KV storage instead
  return NextResponse.json({ message: 'Hello from edge!' });
}
```

### Step 4: Test and Deploy

1. Build and test locally
2. Deploy to staging environment
3. Verify all functionality works
4. Deploy to production

## Best Practices

### Development

- Test with edge runtime early and often
- Use TypeScript for better error catching
- Implement proper error handling
- Monitor build sizes and performance

### Production

- Set up proper monitoring and alerting
- Use environment-specific configurations
- Implement graceful error handling
- Monitor edge function performance

### Security

- Validate all inputs
- Use environment variables for secrets
- Implement proper CORS headers
- Monitor for security vulnerabilities

## Next Steps

- **Monitor performance**: Use Cloudflare Analytics
- **Set up domains**: Configure custom domains
- **Implement monitoring**: Add error tracking and metrics
- **Optimize further**: Fine-tune caching and performance

Ready to deploy Next.js at the edge! 🌐
