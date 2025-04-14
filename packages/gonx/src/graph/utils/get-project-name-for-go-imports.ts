import { workspaceRoot } from '@nx/devkit';
import { GoImportWithModule } from '../types/go-import-with-module';
import { ProjectRootMap } from '../types/project-root-map';
import { dirname } from 'path';

/**
 * Gets the project name for the go import by getting the relative path for the import with in the go module system
 * then uses that to calculate the relative path on disk and looks up which project in the workspace the import is a part
 * of.
 *
 * @param projectRootMap map with project roots in the workspace
 * @param import the go import
 * @param module the go module
 */
export const getProjectNameForGoImport = (
  projectRootMap: ProjectRootMap,
  { import: goImport, module }: GoImportWithModule
): string | null => {
  const relativeImportPath = goImport.substring(module.Path.length + 1);
  const relativeModuleDir = module.Dir.substring(
    workspaceRoot.length + 1
  ).replace(/\\/g, '/');
  let projectPath = relativeModuleDir
    ? `${relativeModuleDir}/${relativeImportPath}`
    : relativeImportPath;

  while (projectPath !== '.') {
    if (projectPath.endsWith('/')) {
      projectPath = projectPath.slice(0, -1);
    }

    const projectName = projectRootMap.get(projectPath);
    if (projectName) {
      return projectName;
    }
    projectPath = dirname(projectPath);
  }
  return null;
};
