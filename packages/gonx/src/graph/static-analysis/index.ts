/**
 * Static analysis strategy for Go dependency detection.
 * Uses tree-sitter to parse Go source files without requiring the Go toolchain.
 */
import {
  CreateDependenciesContext,
  DependencyType,
  RawProjectGraphDependency,
  workspaceRoot,
} from '@nx/devkit';
import { join } from 'path';
import { GoPluginOptions } from '../types/go-plugin-options';
import { buildImportMap } from './build-import-map';
import { extractImports } from './extract-imports';
import { findGoFiles } from './find-go-files';
import { resolveImport } from './resolve-import';

/**
 * Creates project dependencies using static analysis.
 *
 * This is an alternative to the go-runtime strategy that:
 * - Does NOT require Go to be installed
 * - Does NOT require go.work file
 * - Uses tree-sitter WASM for import parsing
 * - Properly handles replace directives in go.mod
 *
 * @param options - Plugin options (unused in this implementation)
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
  // p-limit v4+ is ESM-only, so we use dynamic import for CommonJS compatibility.
  const pLimit = (await import('p-limit')).default;
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
              // Calculate relative file path for sourceFile
              const sourceFile = filePath.startsWith(workspaceRoot)
                ? filePath.slice(workspaceRoot.length + 1)
                : filePath;

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
 * This preserves per-file tracking to match the go-runtime strategy behavior,
 * which is important for incremental updates when files are added or removed.
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
