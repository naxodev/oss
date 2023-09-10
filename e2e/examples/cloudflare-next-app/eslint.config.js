const { FlatCompat } = require('@eslint/eslintrc');
const baseConfig = require('../../../eslint.config.js');
const globals = require('globals');
const js = require('@eslint/js');
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});
module.exports = [
  ...baseConfig,
  ...compat.extends(
    'plugin:@nx/react-typescript',
    'next',
    'next/core-web-vitals'
  ),
  { languageOptions: { globals: { ...globals.jest } } },
  {
    files: [
      'e2e/examples/cloudflare-next-app/**/*.ts',
      'e2e/examples/cloudflare-next-app/**/*.tsx',
      'e2e/examples/cloudflare-next-app/**/*.js',
      'e2e/examples/cloudflare-next-app/**/*.jsx',
    ],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    files: [
      'e2e/examples/cloudflare-next-app/**/*.ts',
      'e2e/examples/cloudflare-next-app/**/*.tsx',
    ],
    rules: {},
  },
  {
    files: [
      'e2e/examples/cloudflare-next-app/**/*.js',
      'e2e/examples/cloudflare-next-app/**/*.jsx',
    ],
    rules: {},
  },
  {
    ignores: [
      'e2e/examples/cloudflare-next-app/.next/**/*',
      'e2e/examples/cloudflare-next-app/.vercel/**/*',
    ],
  },
];
