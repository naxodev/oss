import { execFileSync } from 'node:child_process';

// Side-effecting wrangler invocation shared by the d1 and secret executors.
// Mirrors run-wrangler-types: isolated so callers can be unit-tested by mocking
// it, and so the pure arg-builders stay free of I/O. stdio is inherited so
// interactive prompts (e.g. `wrangler secret put`) and wrangler's own error
// output reach the user. Returns false on a non-zero exit.
export function runWrangler(args: string[], cwd: string): boolean {
  try {
    execFileSync('wrangler', args, { cwd, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}
