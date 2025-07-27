import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  outDir: '../../dist/docs/gonx-docs',
  integrations: [
    starlight({
      title: 'GoNx Docs',
      description: 'Nx plugin for Go development',
      favicon: '/favicon.svg',
      disable404Route: true,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/naxodev/oss/tree/main/packages/gonx',
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
        { label: 'Quick Start', slug: 'quick-start' },
        {
          label: 'Generators',
          items: [
            { label: 'init', slug: 'generators/init' },
            { label: 'application', slug: 'generators/application' },
            { label: 'library', slug: 'generators/library' },
            { label: 'go-blueprint', slug: 'generators/go-blueprint' },
            { label: 'preset', slug: 'generators/preset' },
            { label: 'options', slug: 'generators/options' },
          ],
        },
        {
          label: 'Executors',
          items: [
            { label: 'generate', slug: 'executors/generate' },
            { label: 'build', slug: 'executors/build' },
            { label: 'lint', slug: 'executors/lint' },
            { label: 'test', slug: 'executors/test' },
            { label: 'tidy', slug: 'executors/tidy' },
            { label: 'serve', slug: 'executors/serve' },
            { label: 'release', slug: 'executors/nx-release-publish' },
          ],
        },
        { label: 'Migration from nx-go', slug: 'migration' },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
