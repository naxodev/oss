import { execSync } from 'child_process';

/**
 * Executes the `go list -m -json` command in the
 * specified directory and returns the output as a string.
 *
 * @param cwd the current working directory where the command should be executed.
 * @param failSilently if true, the function will return an empty string instead of throwing an error when the command fails.
 * @returns The output of the `go list -m -json` command as a string.
 * @throws Will throw an error if the command fails and `failSilently` is false.
 */
export const getGoModules = (cwd: string, failSilently: boolean): string => {
  try {
    return execSync('go list -m -json', {
      encoding: 'utf-8',
      cwd,
      stdio: ['ignore'],
      windowsHide: true,
    });
  } catch (error) {
    if (failSilently) {
      return '';
    } else {
      throw error;
    }
  }
};
