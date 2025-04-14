export const build = (projectRoot: string) => ({
  executor: '@naxodev/gonx:build',
  cache: true,
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    '{projectRoot}/**/*.{go}',
  ],
  outputs: [`dist/${projectRoot}`],
});
