import {
  CreateDependencies,
  DependencyType,
  RawProjectGraphDependency,
} from '@nx/devkit';
import { extname } from 'path';
import { GoPluginOptions } from './types/go-plugin-options';
import { GoModule } from './types/go-module';
import { computeGoModules } from './utils/compute-go-modules';
import { ProjectRootMap } from './types/project-root-map';
import { extractProjectRootMap } from './utils/extract-project-root-map';
import { getFileModuleImports } from './utils/get-file-module-imports';
import { getProjectNameForGoImport } from './utils/get-project-name-for-go-imports';

// NOTE: LIMITATION: This assumes the name of the package from the last part of the path.
// So having two package with the same name in different directories will cause issues.

export const createDependencies: CreateDependencies<GoPluginOptions> = async (
  options,
  context
) => {
  const dependencies: RawProjectGraphDependency[] = [];

  let goModules: GoModule[] = null;
  let projectRootMap: ProjectRootMap = null;

  for (const projectName in context.filesToProcess.projectFileMap) {
    const files = context.filesToProcess.projectFileMap[projectName].filter(
      (file) => extname(file.file) === '.go'
    );

    if (files.length > 0 && goModules == null) {
      goModules = computeGoModules(options?.skipGoDependencyCheck);
      projectRootMap = extractProjectRootMap(context);
    }

    for (const file of files) {
      dependencies.push(
        ...getFileModuleImports(file, goModules)
          .map((goImport) =>
            getProjectNameForGoImport(projectRootMap, goImport)
          )
          .filter((target) => target != null)
          .map((target) => ({
            type: DependencyType.static,
            source: projectName,
            target: target,
            sourceFile: file.file,
          }))
      );
    }
  }
  return dependencies;
};
