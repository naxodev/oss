export const lint = (projectRoot: string) => ({
  executor: 'nx:run-commands',
  options: {
    command: 'golangci-lint run',
    cwd: projectRoot,
  },
});
