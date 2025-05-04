export const test = () => ({
  executor: '@naxodev/gonx:test',
  cache: true,
  dependsOn: ['^build'],
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    '{projectRoot}/**/*.{go}',
  ],
});
