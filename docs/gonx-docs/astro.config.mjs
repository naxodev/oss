import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import starlightLlmsTxt from 'starlight-llms-txt';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

const [gonxTypeDoc, gonxTypeDocSidebarGroup] = createStarlightTypeDocPlugin();

const repoRoot = '../../';
const sourceLinkTemplate =
  'https://github.com/naxodev/oss/blob/main/{path}#L{line}';

export default defineConfig({
  site: 'https://gonx.naxo.dev',
  output: 'static',
  outDir: '../../dist/docs/gonx-docs',
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
      title: 'GoNx',
      description: 'Nx plugin for Go development',
      favicon: '/favicon.svg',
      disable404Route: true,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/naxodev/oss',
        },
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/package/@naxodev/gonx',
        },
        {
          icon: 'discord',
          label: 'Discord',
          href: 'https://discord.gg/zjDCGpKP2S',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/naxodev/oss/edit/main/docs/gonx-docs/',
      },
      plugins: [
        starlightLlmsTxt({
          projectName: 'GoNx',
          description:
            'Nx plugin for Go development — generators, executors, and a tree-sitter–based Go static-analysis graph for Nx workspaces.',
          customSets: [
            {
              label: 'Getting Started',
              paths: ['getting-started/**'],
              description: 'Introduction, quick start, and installation',
            },
            {
              label: 'Guides',
              paths: ['guides/**'],
              description: 'Task-oriented how-tos for generators and executors',
            },
            {
              label: 'Reference',
              paths: ['reference/**'],
              description: 'API documentation for @naxodev/gonx',
            },
          ],
          promote: ['getting-started/quick-start'],
        }),
        gonxTypeDoc({
          entryPoints: ['../../packages/gonx/src/index.ts'],
          tsconfig: '../../packages/gonx/tsconfig.lib.json',
          output: 'reference',
          sidebar: { label: '@naxodev/gonx', collapsed: true },
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
          label: 'Tutorials',
          items: [{ slug: 'tutorials/first-go-project' }],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Generators',
              items: [
                { slug: 'guides/generators/application' },
                { slug: 'guides/generators/library' },
                { slug: 'guides/generators/init' },
                { slug: 'guides/generators/preset' },
                { slug: 'guides/generators/go-blueprint' },
                { slug: 'guides/generators/options' },
              ],
            },
            {
              label: 'Executors',
              items: [
                { slug: 'guides/executors/build' },
                { slug: 'guides/executors/serve' },
                { slug: 'guides/executors/test' },
                { slug: 'guides/executors/lint' },
                { slug: 'guides/executors/tidy' },
                { slug: 'guides/executors/generate' },
                { slug: 'guides/executors/nx-release-publish' },
              ],
            },
          ],
        },
        {
          label: 'Reference',
          items: [gonxTypeDocSidebarGroup],
        },
        {
          label: 'Understanding',
          items: [{ slug: 'understanding/static-analysis' }],
        },
        {
          label: 'Community',
          items: [
            { slug: 'community/migration' },
            { slug: 'community/contributing' },
          ],
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
