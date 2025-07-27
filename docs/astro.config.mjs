import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  outDir: '../dist/oss',
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
              label: 'Generators',
              items: [
                { label: 'init', slug: 'gonx/generators/init' },
                { label: 'application', slug: 'gonx/generators/application' },
                { label: 'library', slug: 'gonx/generators/library' },
                { label: 'go-blueprint', slug: 'gonx/generators/go-blueprint' },
                { label: 'preset', slug: 'gonx/generators/preset' },
                { label: 'options', slug: 'gonx/generators/options' },
              ],
            },
            {
              label: 'Executors',
              items: [
                { label: 'generate', slug: 'gonx/executors/generate' },
                { label: 'build', slug: 'gonx/executors/build' },
                { label: 'lint', slug: 'gonx/executors/lint' },
                { label: 'test', slug: 'gonx/executors/test' },
                { label: 'tidy', slug: 'gonx/executors/tidy' },
                { label: 'serve', slug: 'gonx/executors/serve' },
                { label: 'release', slug: 'gonx/executors/nx-release-publish' },
              ],
            },
            { label: 'Migration from nx-go', slug: 'gonx/migration' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
