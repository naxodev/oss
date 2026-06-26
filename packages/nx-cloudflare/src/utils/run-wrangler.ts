import { execFileSync } from 'node:child_process';
import { logger } from '@nx/devkit';

// Side-effecting wrangler invocation shared by the d1 and secret executors.
// Mirrors run-wrangler-types: isolated so callers can be unit-tested by mocking
// it, and so the pure arg-builders stay free of I/O. stdio is inherited so
// interactive prompts (e.g. `wrangler secret put`) and wrangler's own error
// output reach the user. Returns false on a non-zero exit.
export function runWrangler(args: string[], cwd: string): boolean {
  try {
    execFileSync('wrangler', args, { cwd, stdio: 'inherit' });
    return true;
  } catch (e) {
    // On a non-zero exit, wrangler already printed its own error via inherited
    // stdio, so there is nothing useful to add. The exception is a spawn
    // failure (ENOENT): wrangler isn't installed / on PATH, and nothing was
    // printed — surface a one-line hint so the failure isn't silent.
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') {
      logger.error(
        '[nx-cloudflare] `wrangler` was not found on PATH. Install it (e.g. `npm i -D wrangler`) and try again.'
      );
    }
    return false;
  }
}
