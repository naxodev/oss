/**
 * Go dependency detection using tree-sitter static analysis.
 * Parses Go source files without requiring the Go toolchain.
 */
import {
  CreateDependenciesContext,
  DependencyType,
  RawProjectGraphDependency,
  workspaceRoot,
} from '@nx/devkit';
import { normalizePath } from 'nx/src/utils/path';
import pLimit from 'p-limit';
import { join } from 'path';
import { GoPluginOptions } from '../types/go-plugin-options';
import { buildImportMap } from './build-import-map';
import { extractImports } from './extract-imports';
import { findGoFiles } from './find-go-files';
import { resolveImport } from './resolve-import';

/**
 * Creates project dependencies using static analysis.
 *
 * - Does NOT require Go to be installed
 * - Uses tree-sitter WASM for import parsing
 * - Properly handles replace directives in go.mod
 *
 * @param options - Plugin options
 * @param context - Nx dependency context
 * @returns Array of project dependencies
 */
export async function createStaticAnalysisDependencies(
  options: GoPluginOptions | undefined,
  context: CreateDependenciesContext
): Promise<RawProjectGraphDependency[]> {
  const dependencies: RawProjectGraphDependency[] = [];

  // Build the import map from all projects
  const { baseImportMap, projectReplaceDirectives } = await buildImportMap(
    context.projects,
    workspaceRoot
  );

  // If no Go modules found, return empty
  if (baseImportMap.size === 0) {
    return dependencies;
  }

  // Process each project that has files to process
  const projectsToProcess = Object.keys(context.filesToProcess.projectFileMap);

  // Process projects with concurrency limit.
  const limit = pLimit(10);
  await Promise.all(
    projectsToProcess.map((projectName) =>
      limit(async () => {
        const projectConfig = context.projects[projectName];
        if (!projectConfig) {
          return;
        }

        const projectRoot = join(workspaceRoot, projectConfig.root);

        // Get list of Go files to process for this project
        // Either from context.filesToProcess or by scanning directory
        const goFilesFromContext = context.filesToProcess.projectFileMap[
          projectName
        ]?.filter((f) => f.file.endsWith('.go'));

        const goFiles = goFilesFromContext?.length
          ? goFilesFromContext.map((f) => join(workspaceRoot, f.file))
          : await findGoFiles(projectRoot);

        // Process each Go file
        for (const filePath of goFiles) {
          const imports = await extractImports(filePath);

          for (const importPath of imports) {
            const targetProject = resolveImport(
              importPath,
              baseImportMap,
              projectName,
              projectReplaceDirectives
            );

            if (targetProject) {
              // Calculate relative file path for sourceFile, normalized to
              // forward slashes. Nx looks up `sourceFile` by string equality
              // against `projectFileMap`, which stores forward-slash paths,
              // so a native Windows path with `\` would silently mismatch and
              // the dependency edge would be dropped.
              const sourceFile = normalizePath(
                filePath.startsWith(workspaceRoot)
                  ? filePath.slice(workspaceRoot.length + 1)
                  : filePath
              );

              dependencies.push({
                type: DependencyType.static,
                source: projectName,
                target: targetProject,
                sourceFile,
              });
            }
          }
        }
      })
    )
  );

  // Deduplicate dependencies (same source->target->sourceFile can occur from multiple imports)
  return deduplicateDependencies(dependencies);
}

/**
 * Removes duplicate dependencies, keeping one entry per source->target->sourceFile.
 * Preserves per-file tracking for incremental updates when files change.
 */
function deduplicateDependencies(
  dependencies: RawProjectGraphDependency[]
): RawProjectGraphDependency[] {
  const seen = new Set<string>();
  const result: RawProjectGraphDependency[] = [];

  for (const dep of dependencies) {
    // sourceFile exists on StaticDependency but not ImplicitDependency
    const sourceFile = 'sourceFile' in dep ? dep.sourceFile : '';
    const key = `${dep.source}:${dep.target}:${sourceFile}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(dep);
    }
  }

  return result;
}

// Re-export for convenience
export { buildImportMap } from './build-import-map';
export { extractImports } from './extract-imports';
export { findGoFiles } from './find-go-files';
export { isLocalPath } from './is-local-path';
export { parseGoMod } from './parse-go-mod';
export { resolveImport } from './resolve-import';
export { initParser, resetParser } from './parser-init';
