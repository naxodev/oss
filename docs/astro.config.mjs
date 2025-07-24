import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'OSS Workspace Docs',
      description: 'Nx plugins and tools for modern development',
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
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'GoNx',
          items: [
            { label: 'Overview', slug: 'gonx/overview' },
            {
              label: 'Go Generators',
              items: [
                { label: 'Initializer', slug: 'gonx/generators/init' },
                { label: 'Application', slug: 'gonx/generators/application' },
                { label: 'Library', slug: 'gonx/generators/library' },
                { label: 'Go Blueprint', slug: 'gonx/generators/go-blueprint' },
                { label: 'Preset', slug: 'gonx/generators/preset' },
                { label: 'Options', slug: 'gonx/generators/options' },
              ],
            },
            {
              label: 'Go Executors',
              items: [
                { label: 'Generate', slug: 'gonx/executors/generate' },
                { label: 'Build', slug: 'gonx/executors/build' },
                { label: 'Lint', slug: 'gonx/executors/lint' },
                { label: 'Test', slug: 'gonx/executors/test' },
                { label: 'Tidy', slug: 'gonx/executors/tidy' },
                { label: 'Serve', slug: 'gonx/executors/serve' },
                { label: 'Release', slug: 'gonx/executors/nx-release-publish' },
              ],
            },
            { label: 'Migration from nx-go', slug: 'gonx/migration' },
          ],
        },
        {
          label: 'Nx Cloudflare',
          items: [
            { label: 'Overview', slug: 'nx-cloudflare/overview' },
            { label: 'Installation', slug: 'nx-cloudflare/installation' },
            { label: 'Workers', slug: 'nx-cloudflare/workers' },
            { label: 'Libraries', slug: 'nx-cloudflare/libraries' },
            { label: 'Next.js on Cloudflare', slug: 'nx-cloudflare/nextjs' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
