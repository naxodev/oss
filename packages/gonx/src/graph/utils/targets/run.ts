export const run = (projectRoot: string) => ({
  executor: 'nx:run-commands',
  options: {
    command: 'go run .',
    cwd: projectRoot,
  },
});
