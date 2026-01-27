import { readdir } from 'fs/promises';
import { join } from 'path';

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
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    const promises: Promise<string[]>[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded and hidden directories
        if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        // Recurse into subdirectory (in parallel)
        promises.push(findGoFiles(fullPath));
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.go')) {
          files.push(fullPath);
        }
      }
    }

    // Wait for all subdirectory scans to complete
    const nestedFiles = await Promise.all(promises);
    for (const nested of nestedFiles) {
      files.push(...nested);
    }
  } catch {
    // Directory doesn't exist or can't be read - return empty
  }

  return files;
}
