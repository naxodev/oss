import { readdir } from 'fs/promises';
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
 *
 * @param dir - The directory to search in
 * @returns Promise resolving to array of absolute file paths
 */
export async function findGoFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    const results = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
            return [];
          }
          return findGoFiles(fullPath);
        }

        if (entry.isFile() && entry.name.endsWith('.go')) {
          return [fullPath];
        }

        return [];
      })
    );

    return results.flat();
  } catch (error) {
    logger.warn(`Failed to read directory ${dir}: ${error}`);
    return [];
  }
}
