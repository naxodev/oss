---
title: Nx Cloudflare Reference
description: Complete reference for Nx Cloudflare generators, executors, and configuration options
---

This page provides comprehensive reference documentation for all Nx Cloudflare generators, executors, and configuration options.

## Generators

### application

Generate a Cloudflare Worker application.

```bash
nx g @naxodev/nx-cloudflare:application <name> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Application name |
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

#### Example

```bash
nx g @naxodev/nx-cloudflare:application my-worker --template=hono --port=8788 --accountId=abc123
```

### library

Generate a Cloudflare Worker library.

```bash
nx g @naxodev/nx-cloudflare:library <name> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | *required* | Library name |
| `directory` | string | - | Library directory |
| `projectNameAndRootFormat` | `as-provided` \| `derived` | `as-provided` | Project naming format |
| `linter` | `eslint` \| `none` | `eslint` | Linting tool |
| `unitTestRunner` | `vitest` \| `none` | `vitest` | Test runner |
| `tags` | string | - | Project tags |
| `skipFormat` | boolean | `false` | Skip formatting |
| `js` | boolean | `false` | Use JavaScript |
| `strict` | boolean | `true` | TypeScript strict mode |
| `publishable` | boolean | `false` | Make library publishable |
| `importPath` | string | - | Import path for publishable library |
| `bundler` | `swc` \| `tsc` \| `vite` \| `esbuild` \| `none` | `tsc` | Build bundler |
| `minimal` | boolean | `false` | Minimal setup |
| `simpleName` | boolean | `false` | Simple file naming |

#### Example

```bash
nx g @naxodev/nx-cloudflare:library worker-utils --publishable --importPath=@my-org/worker-utils
```

## Executors

### serve

Serve a Cloudflare Worker locally using Wrangler.

```bash
nx serve <project> [options]
```

#### Options

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

#### Example

```bash
nx serve my-worker --port=8788 --env=staging --remote --logLevel=debug
```

### deploy

Deploy a Cloudflare Worker to Cloudflare.

```bash
nx deploy <project> [options]
```

#### Options

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

#### Example

```bash
nx deploy my-worker --env=production --minify --dryRun
```

### next-build

Build Next.js application for Cloudflare Pages (experimental).

```bash
nx build <next-project> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputPath` | string | - | Output directory for build artifacts |
| `buildLibsFromSource` | boolean | `true` | Build libraries from source |
| `fileReplacements` | object[] | - | File replacement patterns |
| `generateLockfile` | boolean | `false` | Generate lockfile |
| `includeDevDependenciesInPackageJson` | boolean | `false` | Include dev dependencies |
| `nextConfig` | string | - | Path to Next.js config file |
| `profile` | boolean | `false` | Enable profiling |
| `debug` | boolean | `false` | Enable debug mode |

#### Example

```bash
nx build my-next-app --outputPath=dist/my-next-app --profile
```

## Configuration Files

### wrangler.toml

Main configuration file for Cloudflare Workers:

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
preview_id = "your-preview-kv-namespace-id"

# R2 Bindings
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
preview_bucket_name = "my-preview-bucket"

# Durable Objects
[[durable_objects.bindings]]
name = "MY_DURABLE_OBJECT"
class_name = "MyDurableObject"
script_name = "my-worker"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"

# Service bindings
[[services]]
binding = "MY_SERVICE"
service = "my-other-worker"
environment = "production"

# Analytics Engine
[[analytics_engine_datasets]]
binding = "AE"
dataset = "my-dataset"

# Cron triggers
[triggers]
crons = ["0 0 * * *", "*/30 * * * *"]

# Worker Routes
[[routes]]
pattern = "example.com/*"
zone_id = "your-zone-id"

# Custom domains
[[route]]
pattern = "api.example.com/*"
custom_domain = true

# Build configuration
[build]
command = "npm run build"
upload.format = "modules"

# Placement
[placement]
mode = "smart"

# Limits
[limits]
cpu_ms = 50
```

### TypeScript Configuration

Configure TypeScript for Workers:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ES2022",
    "lib": ["ES2022", "WebWorker"],
    "target": "ES2022",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Vitest Configuration

Configure testing for Workers:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        MY_VAR: 'test-value',
      },
      kvNamespaces: ['TEST_KV'],
    },
  },
});
```

## Worker Templates

### Fetch Handler (Default)

Standard HTTP request/response worker:

```typescript
export interface Env {
  // Environment variables
  API_KEY: string;
  
  // KV namespaces
  MY_KV: KVNamespace;
  
  // R2 buckets
  MY_BUCKET: R2Bucket;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return new Response('Hello World!');
  },
};
```

### Scheduled Handler

Cron-triggered worker:

```typescript
export interface Env {
  MY_KV: KVNamespace;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('Scheduled event triggered');
    await env.MY_KV.put('last-run', new Date().toISOString());
  },
};
```

### Hono Framework

Modern web framework template:

```typescript
import { Hono } from 'hono';

interface Env {
  MY_KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.text('Hello Hono!'));

app.get('/api/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.env.MY_KV.get(`data:${id}`);
  
  if (!data) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  return c.json({ id, data: JSON.parse(data) });
});

export default app;
```

## Bindings Reference

### KV Storage

```typescript
interface KVNamespace {
  get(key: string, options?: KVGetOptions): Promise<string | null>;
  get(key: string, type: 'text'): Promise<string | null>;
  get(key: string, type: 'json'): Promise<any>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;
  
  delete(key: string): Promise<void>;
  
  list(options?: KVListOptions): Promise<KVListResult>;
  
  getWithMetadata<M>(key: string, options?: KVGetOptions): Promise<KVGetWithMetadataResult<M>>;
}
```

### R2 Storage

```typescript
interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<R2Object | null>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}
```

### D1 Database

```typescript
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}
```

### Durable Objects

```typescript
export class MyDurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}
  
  async fetch(request: Request): Promise<Response> {
    // Handle requests to this Durable Object
    return new Response('Hello from Durable Object!');
  }
}
```

## Environment Variables

### Build-time Variables

Available during build:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
NODE_ENV=production
```

### Runtime Variables

Available in worker execution:

```typescript
export interface Env {
  // Custom environment variables
  API_URL: string;
  DEBUG: string;
  
  // Cloudflare bindings
  MY_KV: KVNamespace;
  MY_BUCKET: R2Bucket;
  DB: D1Database;
}
```

## Compatibility Dates

Current compatibility dates and features:

| Date | Features |
|------|----------|
| `2024-01-01` | Latest stable features |
| `2023-05-18` | R2 bucket bindings |
| `2023-03-01` | D1 database support |
| `2022-11-30` | Durable Objects improvements |
| `2022-08-04` | Enhanced KV operations |

## Best Practices

### Performance

- Keep workers lightweight (< 1MB compressed)
- Use appropriate caching strategies
- Minimize cold start times
- Leverage edge locations

### Security

- Validate all input data
- Use environment variables for secrets
- Implement proper CORS headers
- Sanitize user-generated content

### Development

- Use TypeScript for better developer experience
- Write comprehensive tests
- Monitor performance metrics
- Implement error handling

### Production

- Use environment-specific configurations
- Monitor worker performance
- Implement proper logging
- Set up alerting

## Error Handling

### Common Errors

**1018 - Host Not Found**
```typescript
// Check routing configuration
if (!validHosts.includes(request.headers.get('host'))) {
  return new Response('Host not found', { status: 1018 });
}
```

**1027 - Worker Exceeded CPU Limit**
```typescript
// Optimize CPU-intensive operations
const controller = new AbortController();
setTimeout(() => controller.abort(), 9000); // 9s timeout

try {
  const result = await fetch(url, { signal: controller.signal });
  return result;
} catch (error) {
  if (error.name === 'AbortError') {
    return new Response('Request timeout', { status: 504 });
  }
  throw error;
}
```

## Debugging

### Local Development

```bash
# Start with debug logging
nx serve my-worker --logLevel=debug

# Enable inspector
nx serve my-worker --inspectorPort=9229
```

### Remote Debugging

```bash
# Deploy with debug info
nx deploy my-worker --env=staging

# View logs
npx wrangler tail my-worker --env=staging
```

## Examples

### Basic API Worker

```bash
# Generate worker
nx g @naxodev/nx-cloudflare:application api-worker --template=fetch-handler

# Serve locally  
nx serve api-worker

# Deploy to staging
nx deploy api-worker --env=staging
```

### Scheduled Worker

```bash
# Generate scheduled worker
nx g @naxodev/nx-cloudflare:application cron-worker --template=scheduled-handler

# Test locally (with scheduled endpoint)
nx serve cron-worker --testScheduled

# Deploy with cron trigger
nx deploy cron-worker --triggers="0 */6 * * *"
```

### Worker with Library

```bash
# Generate library
nx g @naxodev/nx-cloudflare:library worker-utils

# Generate worker that uses library
nx g @naxodev/nx-cloudflare:application my-worker

# Build everything
nx build my-worker
```

This reference covers all available options and configurations for Nx Cloudflare. For more detailed examples and guides, see the [workers documentation](/nx-cloudflare/workers/).
