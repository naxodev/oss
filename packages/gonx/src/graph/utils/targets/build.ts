export const build = () => ({
  executor: '@naxodev/gonx:build',
  cache: true,
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    '{projectRoot}/**/*.{go}',
  ],
  options: {
    outputPath: 'dist/{projectRoot}',
  },
  outputs: ['{options.outputPath}'],
});
