import baseConfig from '../../eslint.config.mjs';
import baseConfig1 from '../../eslint.base.config.mjs';
import jsoncEslintParser from 'jsonc-eslint-parser';

export default [
  ...baseConfig,
  ...baseConfig1,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': 'error',
    },
    languageOptions: {
      parser: jsoncEslintParser,
    },
  },
  {
    files: [
      './package.json',
      './executors.json',
      './generators.json',
      './migrations.json',
    ],
    rules: {
      '@nx/nx-plugin-checks': 'error',
    },
    languageOptions: {
      parser: jsoncEslintParser,
    },
  },
  {
    ignores: ['**/test-fixtures/*'],
  },
];
