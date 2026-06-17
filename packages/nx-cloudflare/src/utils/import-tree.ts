import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { joinPathFragments, Tree } from '@nx/devkit';

// C3 always installs and git-inits in its scaffold dir (no skip flag exists);
// these artifacts are reconciled by the workspace, so they never enter the tree.
const EXCLUDED_DIRS = new Set(['node_modules', '.git']);
const EXCLUDED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'bun.lock',
]);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...walk(join(dir, entry.name)));
    } else if (!EXCLUDED_FILES.has(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

export function importDirectoryToTree(
  tree: Tree,
  sourceDir: string,
  destRoot: string
): void {
  for (const file of walk(sourceDir)) {
    const rel = relative(sourceDir, file);
    tree.write(joinPathFragments(destRoot, rel), readFileSync(file));
  }
}
