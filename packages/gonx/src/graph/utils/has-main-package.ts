import { workspaceRoot } from '@nx/devkit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Determines if a Go module contains a main package,
 * indicating it is an application rather than a library.
 *
 * @param projectRoot The root directory of the project
 * @returns True if the project is an application, false otherwise
 */
export function hasMainPackage(projectRoot: string): boolean {
  try {
    // Check if main.go exists in the project root
    const mainGoPath = join(workspaceRoot, projectRoot, 'main.go');
    if (existsSync(mainGoPath)) {
      const content = readFileSync(mainGoPath, 'utf-8');
      return content.includes('package main') && content.includes('func main(');
    }

    // Check for cmd directory structure (common Go pattern)
    const cmdDirPath = join(workspaceRoot, projectRoot, 'cmd');
    if (existsSync(cmdDirPath)) {
      return true;
    }

    return false;
  } catch (error) {
    // If there's any error, default to treating it as a library
    return false;
  }
}
