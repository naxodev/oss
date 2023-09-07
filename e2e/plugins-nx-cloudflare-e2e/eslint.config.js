const baseConfig = require('../../eslint.config.js');
module.exports = [
  ...baseConfig,
  {
    files: [
      'e2e/plugins-nx-cloudflare-e2e/**/*.ts',
      'e2e/plugins-nx-cloudflare-e2e/**/*.tsx',
      'e2e/plugins-nx-cloudflare-e2e/**/*.js',
      'e2e/plugins-nx-cloudflare-e2e/**/*.jsx',
    ],
    rules: {},
  },
  {
    files: [
      'e2e/plugins-nx-cloudflare-e2e/**/*.ts',
      'e2e/plugins-nx-cloudflare-e2e/**/*.tsx',
    ],
    rules: {},
  },
  {
    files: [
      'e2e/plugins-nx-cloudflare-e2e/**/*.js',
      'e2e/plugins-nx-cloudflare-e2e/**/*.jsx',
    ],
    rules: {},
  },
];
