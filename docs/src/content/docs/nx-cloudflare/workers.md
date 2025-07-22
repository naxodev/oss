---
title: Cloudflare Workers
description: Creating and managing Cloudflare Workers with Nx
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

This guide covers creating, developing, and deploying Cloudflare Workers using Nx Cloudflare.

## Creating Workers

Generate a new Cloudflare Worker application:

```bash
nx g @naxodev/nx-cloudflare:application my-worker-app
```

### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Worker name |
| `template` | `fetch-handler` \| `scheduled-handler` \| `hono` \| `none` | `fetch-handler` | Worker template |
| `projectNameAndRootFormat` | `as-provided` \| `derived` | `as-provided` | Project naming format |
| `port` | number | `8787` | Development server port |
| `accountId` | string | - | Cloudflare account ID |
| `js` | boolean | `false` | Use JavaScript instead of TypeScript |
| `tags` | string | - | Project tags for linting |
| `frontendProject` | string | - | Frontend project for proxy setup |
| `unitTestRunner` | `vitest` \| `none` | `vitest` | Test runner |
| `directory` | string | - | Project directory |
| `rootProject` | boolean | `false` | Create at workspace root |
| `skipFormat` | boolean | `false` | Skip formatting files |

## Worker Templates

### Fetch Handler (Default)

The standard HTTP request/response worker:

<Tabs>
<TabItem label="TypeScript">
```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response('Hello World!');
  },
};
```
</TabItem>
<TabItem label="JavaScript">
```javascript
export default {
  async fetch(request) {
    return new Response('Hello World!');
  },
};
```
</TabItem>
</Tabs>

### Scheduled Handler

For cron-triggered workers:

```typescript
export default {
  async scheduled(event: ScheduledEvent): Promise<void> {
    console.log('Scheduled event triggered');
  },
};
```

### Hono Framework

Modern web framework for Workers:

```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('Hello Hono!'));

export default app;
```

### None Template

Blank template for custom implementations.

## Local Development

### Starting the Development Server

```bash
nx serve my-worker-app
```

This starts Wrangler's development server with:
- Hot reload on file changes
- Local environment simulation
- Request/response debugging
- Environment variable support

### Development Server Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `script` | string | - | Entry point path |
| `name` | string | - | Worker name |
| `noBundle` | boolean | `false` | Skip bundling |
| `env` | string | - | Environment name |
| `compatibilityDate` | string | - | Runtime compatibility date |
| `compatibilityFlags` | string[] | - | Compatibility flags |
| `latest` | boolean | `true` | Use latest runtime |
| `ip` | string | - | Listen IP address |
| `port` | number | - | Listen port |
| `inspectorPort` | number | - | Devtools port |
| `routes` | string[] | - | Route patterns |
| `host` | string | - | Forward host |
| `localProtocol` | `http` \| `https` | `http` | Local protocol |
| `localUpstream` | string | - | Upstream host |
| `assets` | string | - | Static assets folder |
| `site` | string | - | Workers Sites folder |
| `siteInclude` | string[] | - | Include patterns |
| `siteExclude` | string[] | - | Exclude patterns |
| `upstreamProtocol` | `http` \| `https` | `https` | Upstream protocol |
| `var` | string[] | - | Environment variables |
| `define` | string[] | - | Global definitions |
| `tsconfig` | string | - | TypeScript config path |
| `minify` | boolean | - | Minify code |
| `nodeCompat` | boolean | - | Node.js compatibility |
| `persistTo` | string | - | Persistence directory |
| `remote` | boolean | `false` | Use remote resources |
| `testScheduled` | boolean | `false` | Enable scheduled testing |
| `logLevel` | `debug` \| `info` \| `log` \| `warn` \| `error` \| `none` | `log` | Log level |

### Example Development Command

```bash
nx serve my-worker --port 8788 --env staging --remote
```

## Building Workers

Workers are automatically built when served or deployed. For manual builds:

```bash
nx build my-worker-app
```

The build process:
1. Bundles TypeScript/JavaScript code
2. Applies transformations and optimizations
3. Generates deployment-ready artifacts
4. Validates compatibility settings

## Deployment

### Deploy to Cloudflare

```bash
nx deploy my-worker-app
```

### Deployment Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | - | Worker name override |
| `noBundle` | boolean | `false` | Skip bundling |
| `env` | string | - | Target environment |
| `outdir` | string | - | Output directory |
| `compatibilityDate` | string | - | Runtime compatibility |
| `compatibilityFlags` | string[] | - | Compatibility flags |
| `latest` | boolean | `true` | Use latest runtime |
| `assets` | string | - | Static assets |
| `site` | string | - | Workers Sites |
| `siteInclude` | string[] | - | Include patterns |
| `siteExclude` | string[] | - | Exclude patterns |
| `var` | string[] | - | Environment variables |
| `define` | string[] | - | Global definitions |
| `triggers` | string[] | - | Cron schedules |
| `routes` | string[] | - | Route patterns |
| `tsconfig` | string | - | TypeScript config |
| `minify` | boolean | - | Minify output |
| `nodeCompat` | boolean | - | Node.js compatibility |
| `dryRun` | boolean | `false` | Compile without deploying |
| `keepVars` | boolean | `false` | Preserve existing variables |

### Environment-Specific Deployment

Deploy to specific environments:

```bash
# Deploy to staging
nx deploy my-worker --env staging

# Deploy to production
nx deploy my-worker --env production
```

## Configuration

### wrangler.toml

The main configuration file for your worker:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "your-account-id"

# Environment variables
[vars]
API_KEY = "development-key"
DEBUG = "true"

# Production environment
[env.production]
name = "my-worker-prod"
vars = { API_KEY = "production-key", DEBUG = "false" }

# KV Bindings
[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-namespace-id"

# R2 Bindings
[[r2_buckets]]
binding = "MY_BUCKET" 
bucket_name = "my-bucket"

# Durable Objects
[[durable_objects.bindings]]
name = "MY_DURABLE_OBJECT"
class_name = "MyDurableObject"

# Cron triggers
[triggers]
crons = ["0 0 * * *"]
```

### TypeScript Configuration

Ensure proper TypeScript setup:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ES2022",
    "lib": ["ES2022"],
    "target": "ES2022",
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*"]
}
```

## Testing

### Unit Testing with Vitest

Run tests for your worker:

```bash
nx test my-worker-app
```

Example test file:

```typescript
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('Worker', () => {
  it('should return hello world', async () => {
    const request = new Request('http://localhost/');
    const response = await worker.fetch(request);
    const text = await response.text();
    
    expect(text).toBe('Hello World!');
  });
});
```

### Integration Testing

Test with Wrangler's local environment:

```bash
# Start dev server in background
nx serve my-worker &

# Run integration tests
curl http://localhost:8787/api/test
```

## Advanced Features

### Environment Variables

Set environment variables in `wrangler.toml`:

```toml
[vars]
API_URL = "https://api.example.com"
DEBUG = "false"
```

Access in your worker:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const apiUrl = env.API_URL;
    const debug = env.DEBUG === 'true';
    
    // Use environment variables
    if (debug) {
      console.log('Debug mode enabled');
    }
    
    return new Response('OK');
  },
};
```

### Bindings

#### KV Storage

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Read from KV
    const value = await env.MY_KV.get('key');
    
    // Write to KV
    await env.MY_KV.put('key', 'value');
    
    return new Response(value);
  },
};
```

#### R2 Storage

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Upload to R2
    await env.MY_BUCKET.put('file.txt', 'content');
    
    // Download from R2
    const object = await env.MY_BUCKET.get('file.txt');
    
    return new Response(await object?.text());
  },
};
```

### Scheduled Workers

For cron-triggered workers:

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    // Perform scheduled task
    console.log('Running scheduled task');
    
    // Access environment variables and bindings
    await env.MY_KV.put('last-run', new Date().toISOString());
  },
};
```

## Best Practices

### Performance
- Keep worker code minimal and fast
- Use appropriate caching strategies
- Leverage Cloudflare's edge locations

### Security
- Validate all input data
- Use environment variables for secrets
- Implement proper CORS headers

### Monitoring
- Use console.log for debugging
- Monitor performance metrics
- Set up error tracking

### Development Workflow
1. Start with local development
2. Write comprehensive tests
3. Use staging environment for integration testing
4. Deploy to production with proper CI/CD

## Troubleshooting

### Common Issues

**Worker deployment fails**
- Check Account ID in `wrangler.toml`
- Verify authentication: `npx wrangler auth whoami`
- Ensure proper permissions

**Local development server won't start**
- Check if port is available
- Verify Wrangler installation
- Clear any cached configurations

**TypeScript errors**
- Install `@cloudflare/workers-types`
- Update `tsconfig.json` configuration
- Check compatibility date settings

## Next Steps

- **Build libraries**: Create [reusable worker libraries](/nx-cloudflare/libraries/)
- **Explore examples**: Check example workers in the workspace
- **Set up CI/CD**: Automate deployments
- **Monitor performance**: Use Cloudflare analytics

Ready to build powerful serverless applications! ⚡
