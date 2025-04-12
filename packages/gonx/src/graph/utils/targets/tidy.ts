export const tidy = (projectRoot: string) => ({
  executor: 'nx:run-commands',
  options: {
    command: 'go mod tidy',
    cwd: projectRoot,
  },
});
