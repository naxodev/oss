import { CreateDependenciesContext } from '@nx/devkit';
import { ProjectRootMap } from '../types/project-root-map';

/**
 * Extracts a map of project root to project name based on context.
 *
 * @param context the Nx graph context
 */
export const extractProjectRootMap = (
  context: CreateDependenciesContext
): ProjectRootMap =>
  Object.keys(context.projects).reduce((map, name) => {
    map.set(context.projects[name].root, name);
    return map;
  }, new Map<string, string>());
