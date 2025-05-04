import { logger } from '@nx/devkit';
import { readdirSync } from 'fs';
import { join } from 'path';

/**
 * Finds all `main.go` files within a given project directory.
 *
 * @param projectRoot - The root directory of the project to search in, relative to the context root.
 * @param contextRoot - The absolute path to the context root, used to resolve the project root.
 * @returns An array of relative paths to `main.go` files found within the project directory.
 */
export function findMainGoFiles(
  projectRoot: string,
  contextRoot: string
): string[] {
  const absoluteProjectRoot = join(contextRoot, projectRoot);
  const mainGoFiles: string[] = [];

  /**
   * Recursively searches a directory for `main.go` files.
   *
   * @param currentPath - The absolute path of the directory to search.
   * @param relativePath - The relative path of the directory from the project root.
   */
  function searchDirectory(currentPath: string, relativePath: string) {
    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });

      // Check for `main.go` in the current directory
      if (entries.some((entry) => entry.isFile() && entry.name === 'main.go')) {
        mainGoFiles.push(join(relativePath, 'main.go'));
      }

      // Recurse into subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Skip common non-source directories
          if (
            ['node_modules', '.git', 'dist', 'build', 'vendor'].includes(
              entry.name
            )
          ) {
            continue;
          }

          const nextPath = join(currentPath, entry.name);
          const nextRelativePath = join(relativePath, entry.name);
          searchDirectory(nextPath, nextRelativePath);
        }
      }
    } catch (error) {
      logger.error(`Error scanning directory ${currentPath}: ${error.message}`);
    }
  }

  // Start recursive search
  searchDirectory(absoluteProjectRoot, projectRoot);

  return mainGoFiles;
}
