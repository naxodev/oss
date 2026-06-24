import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';

// Side-effecting wrangler types invocation: shells out on the real filesystem
// after the generator's virtual Tree has been flushed. Kept in its own module
// (mirroring run-c3.ts) so generator unit tests can mock it without touching
// the pure generator logic. Verified by e2e.
export function runWranglerTypes(projectRoot: string): void {
  const cwd = join(workspaceRoot, projectRoot);
  execFileSync('wrangler', ['types'], {
    cwd,
    stdio: 'inherit',
  });
}
