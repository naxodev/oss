export const lint = () => ({
  executor: '@naxodev/gonx:lint',
  cache: true,
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    '{projectRoot}/**/*.{go}',
  ],
});
