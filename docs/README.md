# OSS Workspace Documentation


All commands are run from the `docs/` directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`            | Installs dependencies                            |
| `pnpm dev`                | Starts local dev server at `localhost:4321`     |
| `pnpm build`              | Build production site to `./dist/`              |
| `pnpm preview`            | Preview your build locally, before deploying    |
| `pnpm astro ...`          | Run CLI commands like `astro add`, `astro check`|
| `pnpm astro -- --help`    | Get help using the Astro CLI                    |

## 📝 Contributing to Documentation

We welcome contributions to improve the documentation! Here's how you can help:

1. **Fix typos or improve clarity** in existing documentation
2. **Add examples** for common use cases
3. **Update outdated information** as the plugins evolve
4. **Add new guides** for advanced topics

See the [Contributing Guide](../CONTRIBUTING.md) for more details.

## 🎯 What's Next?

- Browse the [Getting Started](./src/content/docs/getting-started/) guides
- Explore [GoNx documentation](./src/content/docs/gonx/) for Go development
- Check out [Nx Cloudflare documentation](./src/content/docs/nx-cloudflare/) for edge computing://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

This is the documentation site for the OSS workspace - a collection of Nx plugins and tools for modern development.

## 📦 What's Documented

This documentation covers:

- **GoNx** - Very opinionated Nx plugin for Go/Golang development
- **Nx Cloudflare** - Nx plugin for Cloudflare Workers and edge computing
- **Getting Started** guides and tutorials
- **API Reference** and configuration options

## 🚀 Project Structure

Inside of the OSS workspace documentation, you'll see the following folders and files:

```
.
├── public/                     # Static assets (favicons, images)
├── src/
│   ├── assets/                # Project assets (logos, diagrams)
│   ├── content/
│   │   └── docs/              # Documentation content
│   │       ├── getting-started/
│   │       ├── gonx/          # GoNx plugin documentation
│   │       ├── nx-cloudflare/ # Nx Cloudflare plugin documentation
│   │       └── reference/     # API reference and configuration
│   └── content.config.ts      # Content configuration
├── astro.config.mjs           # Astro + Starlight configuration
├── package.json
└── tsconfig.json
```

Documentation is written in `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

## 🔗 Related Links

- **Main Repository**: [naxodev/oss](https://github.com/naxodev/oss)
- **GoNx Package**: [packages/gonx](../packages/gonx/)
- **Nx Cloudflare Package**: [packages/nx-cloudflare](../packages/nx-cloudflare/)
- **Discord Community**: [Join our Discord](https://discord.gg/zjDCGpKP2S)

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
