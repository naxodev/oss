import { joinPathFragments, Tree } from '@nx/devkit';

/**
 * `wrangler types` output. It is the `typegen` target's declared Nx output (see
 * plugin.ts), so it is a build artifact — regenerated on demand via `nx typegen`,
 * never committed.
 */
export const WORKER_CONFIGURATION_DTS = 'worker-configuration.d.ts';

/**
 * Append an entry to the project's `.gitignore` if absent (matching whole lines
 * so a substring never masks a real entry). Creates the file when absent.
 */
export function ensureGitignored(
  tree: Tree,
  projectRoot: string,
  entry: string
): void {
  const path = joinPathFragments(projectRoot, '.gitignore');
  const existing = tree.exists(path) ? tree.read(path, 'utf-8') ?? '' : '';
  if (existing.split('\n').some((line) => line.trim() === entry)) {
    return;
  }
  const prefix = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  tree.write(path, `${existing}${prefix}${entry}\n`);
}
