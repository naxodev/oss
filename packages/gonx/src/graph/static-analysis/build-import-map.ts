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

    // Skip replace directive processing if none exist
    if (goModInfo.replaceDirectives.size === 0) {
      continue;
    }

    const replaceMap = new Map<string, string | null>();

    for (const [oldPath, newPath] of goModInfo.replaceDirectives) {
      // Module-to-module replacement
      if (!isLocalPath(newPath)) {
        replaceMap.set(oldPath, newPath);
        continue;
      }

      // Resolve local path relative to the project's go.mod directory
      const projectDir = resolve(workspaceRoot, config.root);
      const resolvedPath = resolve(projectDir, newPath);
      const targetProject = dirToProject.get(resolvedPath);

      // Local path doesn't point to an Nx project - suppress to prevent false deps
      if (!targetProject) {
        replaceMap.set(oldPath, null);
        continue;
      }

      // Map old path to target project's module path
      const targetGoMod = parseGoMod(
        join(workspaceRoot, projects[targetProject].root, 'go.mod')
      );

      // Can't determine target module path - suppress
      if (!targetGoMod) {
        replaceMap.set(oldPath, null);
        continue;
      }

      // Local path points to valid Nx project - map to its module path
      replaceMap.set(oldPath, targetGoMod.modulePath);
    }

    if (replaceMap.size > 0) {
      projectReplaceDirectives.set(projectName, replaceMap);
    }
  }

  return {
    baseImportMap,
    projectReplaceDirectives,
  };
}
