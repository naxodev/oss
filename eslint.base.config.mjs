import nx from '@nx/eslint-plugin';

export default [
  // Flat config no longer ignores dotfiles by default.
  { ignores: ['**/.*', '**/dist/**', '**/out-tsc/**', '**/node_modules/**'] },
  ...nx.configs['flat/base'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.js', '**/*.jsx'],
    // Preserve the JavaScript preset before the ESLint 9 migration.
    rules: { 'prefer-const': 'off' },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // Preserve file references accepted before typescript-eslint 8.
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.spec.js', '**/*.spec.jsx'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
];
