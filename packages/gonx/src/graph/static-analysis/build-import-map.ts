/**
 * Builds a mapping of Go module paths to Nx projects.
 * This is used to resolve import statements to project dependencies.
 */
import { join, resolve } from 'path';
import { ProjectConfiguration } from '@nx/devkit';
import { ImportMapResult } from '../types/import-map-result';
import { parseGoMod } from './parse-go-mod';
import { isLocalPath } from './is-local-path';

/**
 * Builds the import map for all Go projects in the workspace.
 *
 * This creates:
 * 1. A base import map: module path -> project name
 * 2. Per-project replace directive maps: old path -> new path (or null for suppression)
 *
 * @param projects - Map of project names to their configurations
 * @param workspaceRoot - Root directory of the Nx workspace
 * @returns ImportMapResult with base map and replace directives
 */
export function buildImportMap(
  projects: Record<string, ProjectConfiguration>,
  workspaceRoot: string
): ImportMapResult {
  const baseImportMap = new Map<string, string>();
  const projectReplaceDirectives = new Map<
    string,
    Map<string, string | null>
  >();

  // Build a map of absolute directory paths to project names for local path resolution
  const dirToProject = new Map<string, string>();
  for (const [projectName, config] of Object.entries(projects)) {
    const absPath = resolve(workspaceRoot, config.root);
    dirToProject.set(absPath, projectName);
  }

  // Process each project
  for (const [projectName, config] of Object.entries(projects)) {
    const goModPath = join(workspaceRoot, config.root, 'go.mod');
    const goModInfo = parseGoMod(goModPath);

    if (!goModInfo) {
      continue;
    }

    // Add to base import map
    baseImportMap.set(goModInfo.modulePath, projectName);

    // Process replace directives for this project
    if (goModInfo.replaceDirectives.size > 0) {
      const replaceMap = new Map<string, string | null>();

      for (const [oldPath, newPath] of goModInfo.replaceDirectives) {
        if (isLocalPath(newPath)) {
          // Resolve local path relative to the project's go.mod directory
          const projectDir = resolve(workspaceRoot, config.root);
          const resolvedPath = resolve(projectDir, newPath);

          // Find which Nx project this path belongs to
          const targetProject = findProjectForPath(resolvedPath, dirToProject);

          if (targetProject) {
            // Map old path to target project's module path
            const targetGoMod = parseGoMod(
              join(workspaceRoot, projects[targetProject].root, 'go.mod')
            );
            if (targetGoMod) {
              replaceMap.set(oldPath, targetGoMod.modulePath);
            } else {
              // Can't determine target module path - suppress
              replaceMap.set(oldPath, null);
            }
          } else {
            // Local path doesn't point to an Nx project - suppress to prevent false deps
            replaceMap.set(oldPath, null);
          }
        } else {
          // Module-to-module replacement
          replaceMap.set(oldPath, newPath);
        }
      }

      if (replaceMap.size > 0) {
        projectReplaceDirectives.set(projectName, replaceMap);
      }
    }
  }

  return {
    baseImportMap,
    projectReplaceDirectives,
  };
}

/**
 * Finds the project that owns a given absolute path.
 *
 * For replace directive resolution, we only match if the resolved path
 * is exactly a project's root directory (since each Nx Go project is
 * a separate module with its own go.mod). Subdirectories within a project
 * don't count as separate projects.
 */
function findProjectForPath(
  absPath: string,
  dirToProject: Map<string, string>
): string | null {
  // Only return a match if the path exactly matches a project root
  // Subdirectories don't count since they're part of the parent module
  return dirToProject.get(absPath) || null;
}
