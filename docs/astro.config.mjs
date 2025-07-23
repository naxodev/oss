import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
		starlight({
			title: 'OSS Workspace',
			description: 'Nx plugins and tools for modern development',
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/naxodev/oss' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/zjDCGpKP2S' }
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
						{ label: 'Installation', slug: 'gonx/installation' },
						{ label: 'Usage', slug: 'gonx/usage' },
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
				{
					label: 'Reference',
					items: [
						{ label: 'GoNx Reference', slug: 'reference/gonx' },
						{ label: 'Nx Cloudflare Reference', slug: 'reference/nx-cloudflare' },
						{ label: 'Compatibility', slug: 'reference/compatibility' },
					],
				},
			],
		}),
	],
});
