import { workspaceRoot } from '@nx/devkit';
import { getGoModules } from './get-go-modules';
import { GoModule } from '../types/go-module';

/**
 * Computes a list of go modules.
 *
 * @param failSilently if true, the function will not throw an error if it fails
 */
export const computeGoModules = (failSilently = false): GoModule[] => {
  const blocks = getGoModules(workspaceRoot, failSilently);
  if (blocks != null) {
    return blocks
      .split('}')
      .filter((block) => block.trim().length > 0)
      .map((block) => JSON.parse(`${block}}`) as GoModule)
      .sort((module1, module2) => module1.Path.localeCompare(module2.Path))
      .reverse();
  }
  throw new Error('Cannot get list of Go modules');
};
