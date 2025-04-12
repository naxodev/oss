import { joinPathFragments } from '@nx/devkit';

export const test = (projectRoot: string) => ({
  executor: 'nx:run-commands',
  options: {
    command: 'go test ./...',
    cwd: projectRoot,
  },
  cache: true,
  inputs: [
    '{projectRoot}/go.mod',
    '{projectRoot}/go.sum',
    joinPathFragments('{projectRoot}', '**', '*.go'),
  ],
  outputs: [],
});
