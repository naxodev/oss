export const generate = () => ({
  executor: '@naxodev/gonx:generate',
  cache: true,
  dependsOn: ['^generate'],
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    '{projectRoot}/**/*.{go}',
  ],
});
