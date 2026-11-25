import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { logger } from '@nx/devkit';

/**
 * Directories to exclude when searching for Go files.
 * Includes Go-specific, build output, and common generated directories.
 */
const EXCLUDED_DIRS = new Set([
  // Go-specific
  'vendor',
  'testdata',
  // Node/JS
  'node_modules',
  // Common build/output directories
  'dist',
  'build',
  'out',
  'bin',
  // Common generated directories
  'gen',
  'generated',
  // Temporary directories
  'tmp',
  'temp',
]);

async function linksToFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return false;
    throw error;
  }
}

/**
 * Recursively finds all .go files in a directory.
 *
 * Excludes:
 * - vendor/, testdata/ (Go-specific)
 * - node_modules/
 * - dist/, build/, out/, bin/ (build output)
 * - gen/, generated/ (generated code)
 * - tmp/, temp/ (temporary files)
 * - Hidden directories (starting with .)
 * - Subdirectories with their own go.mod (nested modules)
 *
 * @param dir - The directory to search in
 * @param isRoot - False for recursive calls; only the root may hold a go.mod
 * @returns Promise resolving to array of absolute file paths
 */
export async function findGoFiles(
  dir: string,
  isRoot = true
): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    // A go.mod below the scanned root starts another module (Go's own module
    // boundary). Its files belong to that module's project; claiming them
    // produces dependency edges Nx rejects (#230).
    if (!isRoot) {
      const manifest = entries.find((entry) => entry.name === 'go.mod');
      if (
        manifest?.isFile() ||
        (manifest?.isSymbolicLink() && (await linksToFile(join(dir, 'go.mod'))))
      ) {
        return [];
      }
    }

    const results = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
            return [];
          }
          return findGoFiles(fullPath, false);
        }

        if (entry.isFile() && entry.name.endsWith('.go')) {
          return [fullPath];
        }

        return [];
      })
    );

    return results.flat();
  } catch (error) {
    // Only swallow ENOENT — the directory was removed between the parent
    // `readdir` and the recursive call (e.g., a clean script running in
    // parallel). Rethrow EACCES, programming errors, etc., so the graph
    // build doesn't silently produce zero dependencies for the project.
    const errnoErr = error as NodeJS.ErrnoException;
    if (errnoErr && errnoErr.code === 'ENOENT') {
      logger.warn(`Directory not found while scanning Go files: ${dir}`);
      return [];
    }
    throw error;
  }
}
