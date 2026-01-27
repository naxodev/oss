/**
 * Resolves Go import paths to Nx project names using longest-prefix matching.
 */

/**
 * Cache for sorted module paths to avoid re-sorting on every resolve call.
 * Key is the Map reference (via WeakMap), value is the sorted array.
 */
const sortedPathsCache = new WeakMap<Map<string, unknown>, string[]>();

/**
 * Gets or creates a sorted array of keys from a map, sorted by length descending.
 * Uses WeakMap caching to avoid re-sorting on every call.
 */
function getSortedPaths<T>(map: Map<string, T>): string[] {
  let sorted = sortedPathsCache.get(map);
  if (!sorted) {
    sorted = Array.from(map.keys()).sort((a, b) => b.length - a.length);
    sortedPathsCache.set(map, sorted);
  }
  return sorted;
}

/**
 * Resolves an import path to an Nx project name.
 *
 * Uses longest-prefix matching against the import map, with replace
 * directive support for the source project.
 *
 * Performance: Sorted path arrays are cached to avoid O(n log n) sorting
 * on every call. For a workspace with 100 projects and 10,000 Go files,
 * this reduces total sort operations from ~10,000 to ~100.
 *
 * @param importPath - The Go import path (e.g., "github.com/myorg/shared/utils")
 * @param baseImportMap - Base mapping of module paths to project names
 * @param sourceProject - The project that contains the import statement
 * @param projectReplaceDirectives - Per-project replace directive mappings
 * @returns Target project name or null if not resolved to workspace project
 */
export function resolveImport(
  importPath: string,
  baseImportMap: Map<string, string>,
  sourceProject: string,
  projectReplaceDirectives: Map<string, Map<string, string | null>>
): string | null {
  // Check if source project has replace directives
  const replaceMap = projectReplaceDirectives.get(sourceProject);

  if (replaceMap) {
    // Check for exact match in replace directives first
    if (replaceMap.has(importPath)) {
      const replacement = replaceMap.get(importPath);
      if (replacement === null) {
        // Null-suppression: this import should be ignored
        return null;
      }
      // Use the replacement path for lookup
      const targetProject = findProjectByLongestPrefix(
        replacement,
        baseImportMap
      );
      if (targetProject && targetProject !== sourceProject) {
        return targetProject;
      }
      return null;
    }

    // Check for prefix match in replace directives (longest match first)
    const sortedReplacePaths = getSortedPaths(replaceMap);

    for (const replacePath of sortedReplacePaths) {
      if (
        importPath.startsWith(replacePath + '/') ||
        importPath === replacePath
      ) {
        const replacement = replaceMap.get(replacePath);
        if (replacement === null) {
          return null;
        }
        // Construct the new import path with the replacement.
        // Note: suffix is either empty (exact match) or starts with '/'
        // because the condition above guarantees startsWith(replacePath + '/').
        const suffix = importPath.slice(replacePath.length);
        const newImportPath = replacement + suffix;
        const targetProject = findProjectByLongestPrefix(
          newImportPath,
          baseImportMap
        );
        if (targetProject && targetProject !== sourceProject) {
          return targetProject;
        }
        return null;
      }
    }
  }

  // Use base import map with longest prefix matching
  const targetProject = findProjectByLongestPrefix(importPath, baseImportMap);

  // Prevent self-referential dependencies
  if (targetProject && targetProject !== sourceProject) {
    return targetProject;
  }

  return null;
}

/**
 * Finds a project using longest-prefix matching.
 *
 * For import "github.com/myorg/shared/utils":
 * - "github.com/myorg/shared" matches -> returns that project
 * - "github.com/myorg" would also match but is shorter
 *
 * @param importPath - The import path to match
 * @param importMap - Map of module paths to project names
 * @returns Project name or null if no match
 */
function findProjectByLongestPrefix(
  importPath: string,
  importMap: Map<string, string>
): string | null {
  const sortedPaths = getSortedPaths(importMap);

  for (const modulePath of sortedPaths) {
    if (importPath === modulePath || importPath.startsWith(modulePath + '/')) {
      return importMap.get(modulePath) || null;
    }
  }

  return null;
}
