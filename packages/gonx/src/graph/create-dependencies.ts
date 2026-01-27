import {
  CreateDependencies,
  DependencyType,
  logger,
  RawProjectGraphDependency,
} from '@nx/devkit';
import { execSync } from 'child_process';
import { extname } from 'path';
import { createStaticAnalysisDependencies } from './static-analysis';
import { GoPluginOptions } from './types/go-plugin-options';
import { GoModule } from './types/go-module';
import { computeGoModules } from './utils/compute-go-modules';
import { ProjectRootMap } from './types/project-root-map';
import { extractProjectRootMap } from './utils/extract-project-root-map';
import { getFileModuleImports } from './utils/get-file-module-imports';
import { getProjectNameForGoImport } from './utils/get-project-name-for-go-imports';

// NOTE: LIMITATION: This assumes the name of the package from the last part of the path.
// So having two package with the same name in different directories will cause issues.

/**
 * Checks if the Go runtime is available by attempting to run `go version`.
 */
function isGoAvailable(): boolean {
  try {
    execSync('go version', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates dependencies using the go-runtime strategy.
 * This is the original implementation using `go list -m -json`.
 */
function createGoRuntimeDependencies(
  options: GoPluginOptions | undefined,
  context: Parameters<CreateDependencies<GoPluginOptions>>[1]
): RawProjectGraphDependency[] {
  const dependencies: RawProjectGraphDependency[] = [];

  let goModules: GoModule[] | null = null;
  let projectRootMap: ProjectRootMap | null = null;

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
}

export const createDependencies: CreateDependencies<GoPluginOptions> = async (
  options,
  context
) => {
  // Skip dependency detection if explicitly disabled
  if (options?.skipGoDependencyCheck) {
    return [];
  }

  const strategy = options?.dependencyStrategy ?? 'go-runtime';

  // Use static analysis strategy
  if (strategy === 'static-analysis') {
    return createStaticAnalysisDependencies(options, context);
  }

  // Auto strategy: try go-runtime, fall back to static-analysis on any failure
  if (strategy === 'auto') {
    if (!isGoAvailable()) {
      return createStaticAnalysisDependencies(options, context);
    }
    // Go is available, try go-runtime but fall back on failure
    try {
      return createGoRuntimeDependencies(options, context);
    } catch (error) {
      // go-runtime failed (e.g., missing go.work, invalid module state)
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `go-runtime dependency detection failed: ${message}. ` +
          `Falling back to static-analysis strategy.`
      );
      return createStaticAnalysisDependencies(options, context);
    }
  }

  // Default: go-runtime strategy
  return createGoRuntimeDependencies(options, context);
};
