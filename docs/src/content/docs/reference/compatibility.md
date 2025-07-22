---
title: Compatibility
description: Version compatibility and requirements for OSS workspace plugins
---

This page provides compatibility information for all plugins in the OSS workspace.

## Plugin Compatibility Matrix

### GoNx Compatibility

| Nx Version | GoNx Version | Go Version | Support Status |
|------------|--------------|------------|----------------|
| 21.x       | ^1.0.0 - ^2.0.0 | 1.18+ | ✅ Active |
| 20.x       | Not supported | - | ❌ Deprecated |
| 19.x       | Not supported | - | ❌ Deprecated |

#### Go Version Requirements

- **Minimum**: Go 1.18 (required for multi-module workspaces)
- **Recommended**: Go 1.21+ (latest stable features)
- **Testing**: Only stable Go versions receive testing and support

### Nx Cloudflare Compatibility

| Nx Version | Nx Cloudflare Version | Node.js Version | Support Status |
|------------|----------------------|-----------------|----------------|
| 20.x       | 4.x | 18+ | ✅ Active |
| 19.x       | 3.x | 18+ | ✅ Active |
| 18.x       | 2.x | 16+ | ⚠️ Maintenance |
| 17.x       | 1.x | 16+ | ❌ End of Life |

#### Node.js Version Requirements

- **Minimum**: Node.js 16 (for older Nx Cloudflare versions)
- **Recommended**: Node.js 18+ (for latest features)
- **Testing**: LTS versions receive priority support

## Runtime Compatibility

### GoNx Runtime Support

#### Operating Systems

| OS | Support Level | Notes |
|----|---------------|-------|
| Linux | ✅ Full | Primary development and CI platform |
| macOS | ✅ Full | Intel and Apple Silicon supported |
| Windows | ✅ Full | PowerShell and Command Prompt |

#### Go Toolchain Features

| Feature | Minimum Go Version | Notes |
|---------|-------------------|-------|
| Basic operations | 1.18 | Minimum supported version |
| Multi-module workspaces | 1.18 | Required for go.work files |
| Generics support | 1.18 | Full type parameter support |
| Fuzzing | 1.18 | Built-in fuzzing support |
| Latest features | 1.21+ | Recommended for new projects |

### Nx Cloudflare Runtime Support

#### Cloudflare Runtime

| Runtime Feature | Support Level | Notes |
|----------------|---------------|-------|
| Workers Runtime | ✅ Full | Latest compatibility dates |
| Edge Runtime | ✅ Full | Next.js edge functions |
| Node.js APIs | ⚠️ Limited | Edge-compatible APIs only |
| WebAssembly | ✅ Full | WASM module support |

#### Browser Compatibility

Cloudflare Workers run on Cloudflare's edge network and support:

- **ES2022** features and syntax
- **WebAPI** standards (Fetch, Request, Response, etc.)
- **Web Streams API**
- **Web Crypto API**
- **TextEncoder/TextDecoder**

## Development Environment Compatibility

### IDEs and Editors

#### Recommended Setup

| Tool | GoNx Support | Nx Cloudflare Support | Notes |
|------|-------------|----------------------|-------|
| VS Code | ✅ Excellent | ✅ Excellent | Recommended with Go and TypeScript extensions |
| IntelliJ IDEA | ✅ Good | ✅ Good | Go plugin required |
| Vim/Neovim | ✅ Good | ✅ Good | Language server support |
| Emacs | ✅ Good | ✅ Good | Go mode and TypeScript support |

#### Required Extensions/Plugins

**For GoNx:**
- Go language support
- Go debugging capabilities
- Go test runner integration

**For Nx Cloudflare:**
- TypeScript/JavaScript support
- Cloudflare Workers extension (VS Code)
- Wrangler CLI integration

### Package Managers

| Package Manager | GoNx | Nx Cloudflare | Notes |
|----------------|------|---------------|-------|
| npm | ✅ Full | ✅ Full | Default package manager |
| pnpm | ✅ Full | ✅ Full | Faster installs, recommended |
| Yarn Classic | ✅ Full | ✅ Full | Stable support |
| Yarn Berry | ⚠️ Limited | ⚠️ Limited | Some compatibility issues |

## CI/CD Compatibility

### CI Platforms

| Platform | GoNx | Nx Cloudflare | Notes |
|----------|------|---------------|-------|
| GitHub Actions | ✅ Full | ✅ Full | First-class support |
| GitLab CI | ✅ Full | ✅ Full | Docker images available |
| Azure DevOps | ✅ Full | ✅ Full | Windows agents supported |
| CircleCI | ✅ Full | ✅ Full | Orbs available |
| Jenkins | ✅ Good | ✅ Good | Plugin ecosystem |

### Docker Support

#### GoNx Docker Compatibility

```dockerfile
# Multi-stage build support
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN nx build my-go-app

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/dist/my-go-app .
CMD ["./my-go-app"]
```

#### Nx Cloudflare Docker Compatibility

```dockerfile
# Node.js build environment
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN nx build my-worker

# Wrangler deployment
FROM node:18-alpine
RUN npm install -g wrangler
COPY --from=builder /app/dist ./dist
CMD ["wrangler", "deploy"]
```

## API Compatibility

### GoNx API Stability

| API Component | Stability Level | Breaking Change Policy |
|---------------|----------------|----------------------|
| Generators | ✅ Stable | Semantic versioning |
| Executors | ✅ Stable | Semantic versioning |
| Configuration | ✅ Stable | Migration guides provided |
| Plugin Interface | ⚠️ Evolving | May change with Nx updates |

### Nx Cloudflare API Stability

| API Component | Stability Level | Breaking Change Policy |
|---------------|----------------|----------------------|
| Generators | ✅ Stable | Semantic versioning |
| Executors | ✅ Stable | Semantic versioning |
| Wrangler Integration | ⚠️ External | Follows Wrangler CLI changes |
| Next.js Builder | ⚠️ Experimental | Subject to change |

## Upgrade Paths

### GoNx Upgrade Strategy

#### From nx-go to GoNx

```bash
# 1. Remove old plugin
npm uninstall @nx-go/nx-go

# 2. Install GoNx
npm install @naxodev/gonx

# 3. Update configuration
# See migration guide for details

# 4. Test functionality
nx build my-go-app
nx test my-go-lib
```

#### Version Upgrade Process

1. **Check compatibility** in this matrix
2. **Update package** to new version
3. **Run migration** if provided
4. **Test thoroughly** before deployment
5. **Update CI/CD** configurations if needed

### Nx Cloudflare Upgrade Strategy

#### Version Upgrade Process

```bash
# 1. Check current version
npm list @naxodev/nx-cloudflare

# 2. Update to target version
npm update @naxodev/nx-cloudflare

# 3. Update Wrangler if needed
npm update wrangler

# 4. Test locally
nx serve my-worker

# 5. Test deployment
nx deploy my-worker --env=staging
```

## Known Issues and Workarounds

### GoNx Known Issues

#### Issue: Go.work conflicts in monorepos

**Symptoms**: Module resolution errors with go.work files

**Workaround**:
```bash
# Disable go.work creation
nx g @naxodev/gonx:init --addGoDotWork=false

# Or manage go.work manually
```

#### Issue: Windows path separators

**Symptoms**: Build failures on Windows with path-related errors

**Workaround**:
```bash
# Use forward slashes in configurations
"main": "cmd/server/main.go"  # Not "cmd\\server\\main.go"
```

### Nx Cloudflare Known Issues

#### Issue: Node.js compatibility in Workers

**Symptoms**: Runtime errors with Node.js-specific APIs

**Workaround**:
```typescript
// Use Web APIs instead of Node.js APIs
const response = await fetch(url);  // Not require('http')
```

#### Issue: Large bundle sizes

**Symptoms**: Worker deployment failures due to size limits

**Workaround**:
```bash
# Enable minification
nx deploy my-worker --minify

# Use dynamic imports for code splitting
const module = await import('./heavy-module');
```

## Browser and Runtime Support

### Cloudflare Workers Runtime

#### Supported Web APIs

- ✅ Fetch API
- ✅ Request/Response
- ✅ Headers
- ✅ URL/URLSearchParams
- ✅ Web Streams
- ✅ Web Crypto
- ✅ TextEncoder/TextDecoder
- ✅ AbortController/AbortSignal
- ✅ FormData
- ✅ WebSocket (in some cases)

#### Not Supported

- ❌ DOM APIs
- ❌ Node.js APIs (fs, path, etc.)
- ❌ Browser-specific APIs (localStorage, etc.)
- ❌ XMLHttpRequest

### Go Runtime Support

#### Supported Go Standard Library

GoNx supports the full Go standard library with platform-specific considerations:

- ✅ All core packages (fmt, strings, etc.)
- ✅ Network packages (net/http, etc.)
- ✅ Crypto packages
- ✅ Database drivers (with cgo if needed)
- ✅ Testing packages

## Support Lifecycle

### Long-term Support (LTS)

| Plugin | Current LTS | Support Until | Security Updates |
|--------|-------------|---------------|------------------|
| GoNx | 1.x | Dec 2025 | Until Dec 2026 |
| Nx Cloudflare | 4.x | Jun 2025 | Until Jun 2026 |

### End-of-Life (EOL) Policy

- **Security updates**: 12 months after LTS end
- **Bug fixes**: 6 months after LTS end
- **Feature updates**: Only in current major version
- **Migration support**: Provided for 1 major version

## Getting Help

### Compatibility Issues

If you encounter compatibility issues:

1. **Check this page** for known issues
2. **Search GitHub issues** for similar problems
3. **Join Discord** for community support
4. **Create GitHub issue** with detailed environment info

### Environment Information

When reporting issues, include:

```bash
# For GoNx issues
go version
nx --version
npm list @naxodev/gonx

# For Nx Cloudflare issues
node --version
nx --version
npx wrangler --version
npm list @naxodev/nx-cloudflare
```

### Community Resources

- **Discord**: [Join our server](https://discord.gg/zjDCGpKP2S)
- **GitHub**: [Report issues](https://github.com/abelpenton/oss)
- **Documentation**: This comprehensive guide
- **Examples**: Check the workspace examples directory

Stay up to date with compatibility changes by following our release notes and changelog! 📋
