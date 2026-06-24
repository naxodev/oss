import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import starlightLlmsTxt from 'starlight-llms-txt';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

const [nxCloudflareTypeDoc, nxCloudflareTypeDocSidebarGroup] =
  createStarlightTypeDocPlugin();

// TypeDoc emits {path} relative to its `basePath` setting. We pin basePath to
// the workspace root so {path} carries the full repo-relative path (e.g.
// `packages/nx-cloudflare/src/index.ts`).
const repoRoot = '../../';
const sourceLinkTemplate =
  'https://github.com/naxodev/oss/blob/main/{path}#L{line}';

export default defineConfig({
  site: 'https://nx-cloudflare.naxo.dev',
  output: 'static',
  outDir: '../../dist/docs/nx-cloudflare-docs',
  redirects: {
    '/': { destination: '/getting-started/introduction/', status: 301 },
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      transformers: [
        {
          // Extract title="..." from code fence meta and set as data attribute
          name: 'meta-title',
          pre(node) {
            const raw = this.options.meta?.__raw;
            if (!raw) return;
            const match = raw.match(/title="([^"]+)"/);
            if (match) {
              node.properties['data-title'] = match[1];
            }
          },
        },
      ],
    },
  },
  integrations: [
    starlight({
      title: 'Nx Cloudflare',
      description:
        'Nx plugin for Cloudflare Workers — generators, executors, and project inference around Wrangler.',
      favicon: '/favicon.svg',
      disable404Route: true,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/naxodev/oss/tree/main/packages/nx-cloudflare',
        },
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/package/@naxodev/nx-cloudflare',
        },
        {
          icon: 'discord',
          label: 'Discord',
          href: 'https://discord.gg/zjDCGpKP2S',
        },
      ],
      editLink: {
        baseUrl:
          'https://github.com/naxodev/oss/edit/main/docs/nx-cloudflare-docs/',
      },
      plugins: [
        starlightLlmsTxt({
          projectName: 'Nx Cloudflare',
          description:
            'Nx plugin for Cloudflare Workers — generators, executors, and a createNodesV2 inference plugin around Wrangler.',
          details: `
## Key Features
- **Generators**: Scaffold Cloudflare Worker applications and libraries with Wrangler config, TypeScript, and Vitest pre-configured
- **Inferred Targets**: Automatically create serve, deploy, typegen, version-upload, and tail targets from Wrangler config files
- **Project Inference**: Detect Cloudflare Worker projects via Wrangler config and build the Nx project graph

## Package
- \`@naxodev/nx-cloudflare\` — Nx plugin for Cloudflare Workers
`,
          customSets: [
            {
              label: 'Getting Started',
              paths: ['getting-started/**'],
              description: 'Introduction, quick start, and installation',
            },
            {
              label: 'Guides',
              paths: ['guides/**'],
              description: "Task-oriented how-tos for the plugin's generators",
            },
            {
              label: 'Reference',
              paths: ['reference/**'],
              description: 'API documentation for @naxodev/nx-cloudflare',
            },
          ],
          promote: ['getting-started/quick-start'],
        }),
        nxCloudflareTypeDoc({
          entryPoints: ['../../packages/nx-cloudflare/src/index.ts'],
          tsconfig: '../../packages/nx-cloudflare/tsconfig.lib.json',
          output: 'reference',
          sidebar: { label: '@naxodev/nx-cloudflare', collapsed: true },
          typeDoc: {
            excludeInternal: true,
            disableGit: true,
            basePath: repoRoot,
            sourceLinkTemplate,
          },
        }),
      ],
      customCss: ['./src/styles/custom.css'],
      expressiveCode: false,
      components: {
        Header: './src/components/Header.astro',
        Sidebar: './src/components/Sidebar.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        Head: './src/components/Head.astro',
        Pagination: './src/components/Pagination.astro',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { slug: 'getting-started/introduction' },
            { slug: 'getting-started/quick-start' },
            { slug: 'getting-started/installation' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { slug: 'guides/generators-application' },
            { slug: 'guides/generators-init' },
            { slug: 'guides/generators-library' },
            { slug: 'guides/generators-binding' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { slug: 'inferred-targets' },
            nxCloudflareTypeDocSidebarGroup,
          ],
        },
        {
          label: 'Understanding',
          items: [
            { slug: 'understanding/wrangler' },
            { slug: 'understanding/plugin-options' },
          ],
        },
        {
          label: 'Community',
          items: [{ slug: 'community/migration' }],
        },
      ],
      lastUpdated: true,
      pagination: true,
    }),
    react(),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-heading',
      weights: [400, 500, 600, 700],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-code',
      weights: [400, 500],
      fallbacks: ['monospace'],
    },
  ],
});
