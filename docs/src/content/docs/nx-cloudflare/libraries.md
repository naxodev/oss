---
title: Cloudflare Worker Libraries
description: Creating and using reusable libraries for Cloudflare Workers
---

This guide covers creating and managing reusable libraries for Cloudflare Workers development.

## Creating Libraries

Generate a new Cloudflare Worker library:

```bash
nx g @naxodev/nx-cloudflare:library my-worker-lib
```

### Available Options

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

## Library Structure

A typical Worker library structure:

```
libs/my-worker-lib/
├── src/
│   ├── index.ts          # Main export
│   └── lib/
│       └── my-worker-lib.ts
├── tsconfig.json
├── tsconfig.lib.json
├── project.json
├── vitest.config.ts      # If using Vitest
└── README.md
```

## Common Library Patterns

### Utility Libraries

Create shared utilities for common Worker tasks:

```typescript
// libs/worker-utils/src/index.ts

export interface RequestContext {
  request: Request;
  env: Record<string, any>;
  ctx: ExecutionContext;
}

export class ResponseBuilder {
  private headers = new Headers();
  private status = 200;

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  setStatus(status: number): this {
    this.status = status;
    return this;
  }

  json(data: any): Response {
    this.headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(data), {
      status: this.status,
      headers: this.headers,
    });
  }

  text(content: string): Response {
    this.headers.set('Content-Type', 'text/plain');
    return new Response(content, {
      status: this.status,
      headers: this.headers,
    });
  }
}

export function createCorsHeaders(origin?: string): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return headers;
}
```

### Authentication Libraries

Shared authentication logic:

```typescript
// libs/auth/src/index.ts

export interface User {
  id: string;
  email: string;
  roles: string[];
}

export class JwtAuth {
  constructor(private secret: string) {}

  async verifyToken(token: string): Promise<User | null> {
    try {
      // JWT verification logic
      const payload = await this.decode(token);
      return this.validateUser(payload);
    } catch {
      return null;
    }
  }

  private async decode(token: string): Promise<any> {
    // JWT decoding implementation
  }

  private validateUser(payload: any): User {
    // User validation logic
  }
}

export function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice(7);
}
```

### Database Libraries

KV and R2 abstractions:

```typescript
// libs/storage/src/index.ts

export class KVRepository<T> {
  constructor(
    private kv: KVNamespace,
    private prefix: string = ''
  ) {}

  async get(key: string): Promise<T | null> {
    const value = await this.kv.get(`${this.prefix}${key}`);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const options = ttl ? { expirationTtl: ttl } : undefined;
    await this.kv.put(`${this.prefix}${key}`, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(`${this.prefix}${key}`);
  }

  async list(prefix?: string): Promise<string[]> {
    const listKey = `${this.prefix}${prefix || ''}`;
    const result = await this.kv.list({ prefix: listKey });
    return result.keys.map(k => k.name.slice(this.prefix.length));
  }
}

export class R2FileManager {
  constructor(private bucket: R2Bucket) {}

  async upload(key: string, data: ArrayBuffer | string): Promise<void> {
    await this.bucket.put(key, data);
  }

  async download(key: string): Promise<ArrayBuffer | null> {
    const object = await this.bucket.get(key);
    return object?.arrayBuffer() || null;
  }

  async exists(key: string): Promise<boolean> {
    const object = await this.bucket.head(key);
    return object !== null;
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
```

### Middleware Libraries

Request/response middleware patterns:

```typescript
// libs/middleware/src/index.ts

export type MiddlewareHandler = (
  request: Request,
  env: any,
  ctx: ExecutionContext,
  next: () => Promise<Response>
) => Promise<Response>;

export class MiddlewareChain {
  private middlewares: MiddlewareHandler[] = [];

  use(middleware: MiddlewareHandler): this {
    this.middlewares.push(middleware);
    return this;
  }

  async handle(
    request: Request,
    env: any,
    ctx: ExecutionContext,
    handler: () => Promise<Response>
  ): Promise<Response> {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index >= this.middlewares.length) {
        return handler();
      }
      
      const middleware = this.middlewares[index++];
      return middleware(request, env, ctx, next);
    };

    return next();
  }
}

export const corsMiddleware: MiddlewareHandler = async (request, env, ctx, next) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(),
    });
  }

  const response = await next();
  const corsHeaders = createCorsHeaders();
  
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
};

export const rateLimitMiddleware = (
  limit: number,
  windowMs: number
): MiddlewareHandler => {
  return async (request, env, ctx, next) => {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rate-limit:${ip}`;
    
    // Rate limiting logic using KV
    const current = await env.RATE_LIMIT_KV.get(key);
    if (current && parseInt(current) >= limit) {
      return new Response('Rate limit exceeded', { status: 429 });
    }

    // Continue with request
    const response = await next();
    
    // Update rate limit counter
    const count = current ? parseInt(current) + 1 : 1;
    await env.RATE_LIMIT_KV.put(key, count.toString(), {
      expirationTtl: Math.floor(windowMs / 1000),
    });

    return response;
  };
};
```

## Using Libraries in Workers

### Import and Use

```typescript
// apps/my-worker/src/index.ts
import { ResponseBuilder, createCorsHeaders } from '@my-org/worker-utils';
import { JwtAuth, extractBearerToken } from '@my-org/auth';
import { KVRepository } from '@my-org/storage';
import { MiddlewareChain, corsMiddleware, rateLimitMiddleware } from '@my-org/middleware';

interface Env {
  JWT_SECRET: string;
  USER_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
}

const middleware = new MiddlewareChain()
  .use(corsMiddleware)
  .use(rateLimitMiddleware(100, 60000)); // 100 requests per minute

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return middleware.handle(request, env, ctx, async () => {
      const auth = new JwtAuth(env.JWT_SECRET);
      const userRepo = new KVRepository(env.USER_KV, 'users:');
      
      const token = extractBearerToken(request);
      if (!token) {
        return new ResponseBuilder()
          .setStatus(401)
          .json({ error: 'Missing authorization token' });
      }

      const user = await auth.verifyToken(token);
      if (!user) {
        return new ResponseBuilder()
          .setStatus(401)
          .json({ error: 'Invalid token' });
      }

      // Handle authenticated request
      return new ResponseBuilder()
        .json({ message: `Hello, ${user.email}!` });
    });
  },
};
```

### Dependency Management

Libraries automatically appear in your worker's dependency graph. Nx will:

1. Build libraries before workers that depend on them
2. Rebuild workers when libraries change
3. Cache library builds for faster subsequent builds
4. Show dependency relationships in the project graph

## Testing Libraries

### Unit Testing

```typescript
// libs/worker-utils/src/lib/response-builder.spec.ts
import { describe, it, expect } from 'vitest';
import { ResponseBuilder } from './response-builder';

describe('ResponseBuilder', () => {
  it('should create JSON response', () => {
    const builder = new ResponseBuilder();
    const response = builder.json({ message: 'Hello' });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should set custom status and headers', () => {
    const builder = new ResponseBuilder();
    const response = builder
      .setStatus(201)
      .setHeader('X-Custom', 'value')
      .text('Created');
    
    expect(response.status).toBe(201);
    expect(response.headers.get('X-Custom')).toBe('value');
  });
});
```

### Integration Testing

Test libraries with actual Worker environment:

```typescript
// libs/auth/src/lib/jwt-auth.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { JwtAuth } from './jwt-auth';

describe('JwtAuth Integration', () => {
  let auth: JwtAuth;

  beforeEach(() => {
    auth = new JwtAuth('test-secret');
  });

  it('should verify valid tokens', async () => {
    // Create a test token
    const token = await auth.createToken({ id: '1', email: 'test@example.com' });
    
    // Verify the token
    const user = await auth.verifyToken(token);
    
    expect(user).toEqual({
      id: '1',
      email: 'test@example.com',
      roles: []
    });
  });
});
```

## Building Libraries

### Manual Build

```bash
nx build my-worker-lib
```

### Automatic Building

Libraries are automatically built when:
- A dependent worker is built
- Running `nx build` on the entire workspace
- CI/CD pipelines run affected builds

### Build Configuration

Configure library builds in `project.json`:

```json
{
  "name": "my-worker-lib",
  "targets": {
    "build": {
      "executor": "@nx/esbuild:esbuild",
      "options": {
        "outputPath": "dist/libs/my-worker-lib",
        "main": "libs/my-worker-lib/src/index.ts",
        "tsConfig": "libs/my-worker-lib/tsconfig.lib.json",
        "assets": [],
        "format": ["esm"],
        "bundle": false
      }
    }
  }
}
```

## Publishing Libraries

### Internal Publishing

For monorepo-only libraries, no publishing is needed. Libraries are consumed directly through TypeScript paths.

### External Publishing

For publishable libraries:

```bash
# Build the library
nx build my-worker-lib

# Publish to npm
cd dist/libs/my-worker-lib
npm publish
```

### Package Configuration

Configure `package.json` for publishable libraries:

```json
{
  "name": "@my-org/worker-lib",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts",
  "exports": {
    ".": {
      "import": "./index.js",
      "types": "./index.d.ts"
    }
  }
}
```

## Best Practices

### Library Design
- Keep libraries focused on single responsibilities
- Provide clear, typed interfaces
- Include comprehensive documentation
- Write thorough tests

### Performance
- Keep bundle sizes small
- Use tree-shaking friendly exports
- Avoid heavy dependencies
- Consider Worker runtime limitations

### Compatibility
- Target appropriate browser/Worker APIs
- Test with different Cloudflare compatibility dates
- Document compatibility requirements
- Use feature detection when necessary

### Maintenance
- Version libraries semantically
- Maintain backwards compatibility
- Provide migration guides for breaking changes
- Keep dependencies up to date

## Troubleshooting

### Common Issues

**Library not found during build**
- Check import paths in `tsconfig.base.json`
- Verify library is built before worker
- Clear Nx cache: `nx reset`

**Type errors with library imports**
- Ensure proper TypeScript configuration
- Check `tsconfig.lib.json` in library
- Verify export/import syntax

**Runtime errors in Worker**
- Test library functions in isolation
- Check for Node.js-specific APIs
- Validate with Wrangler's dev environment

## Next Steps

- **Create shared types**: Define common interfaces across workers
- **Build API clients**: Create libraries for external service integration  
- **Develop testing utilities**: Share test helpers across projects
- **Set up monitoring**: Create shared observability libraries

Build once, use everywhere! 📦
