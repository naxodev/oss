import { joinPathFragments } from '@nx/devkit';

export const build = (projectRoot: string, projectName: string) => ({
  executor: 'nx:run-commands',
  options: {
    command: 'go build .',
    cwd: projectRoot,
  },
  cache: true,
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    joinPathFragments('{projectRoot}', '**', '*.go'),
  ],
  outputs: ['{projectRoot}/' + projectName],
});
