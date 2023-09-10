const { FlatCompat } = require('@eslint/eslintrc');
const baseConfig = require('../../../eslint.config.js');
const js = require('@eslint/js');
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});
module.exports = [
  ...baseConfig,
  {
    files: [
      'packages/plugins/nx-cloudflare/**/*.ts',
      'packages/plugins/nx-cloudflare/**/*.tsx',
      'packages/plugins/nx-cloudflare/**/*.js',
      'packages/plugins/nx-cloudflare/**/*.jsx',
    ],
    rules: {},
  },
  {
    files: [
      'packages/plugins/nx-cloudflare/**/*.ts',
      'packages/plugins/nx-cloudflare/**/*.tsx',
    ],
    rules: {},
  },
  {
    files: [
      'packages/plugins/nx-cloudflare/**/*.js',
      'packages/plugins/nx-cloudflare/**/*.jsx',
    ],
    rules: {},
  },
  ...compat.config({ parser: 'jsonc-eslint-parser' }).map((config) => ({
    ...config,
    files: [
      'packages/plugins/nx-cloudflare/package.json',
      'packages/plugins/nx-cloudflare/generators.json',
      'packages/plugins/nx-cloudflare/executors.json',
    ],
    rules: { '@nx/nx-plugin-checks': 'error' },
  })),
];
