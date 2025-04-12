export const tidy = () => ({
  executor: '@naxodev/gonx:tidy',
  cache: true,
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    '{projectRoot}/**/*.{go}',
  ],
});
