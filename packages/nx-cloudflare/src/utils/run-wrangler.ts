import { execFileSync } from 'node:child_process';
import { logger } from '@nx/devkit';

export interface RunWranglerOptions {
  /**
   * Capture stdout/stderr instead of inheriting them. Needed by callers that
   * read wrangler's output — provisioning parses a created resource's id out
   * of stdout, and wants a failure reason richer than "non-zero exit".
   */
  captureOutput?: boolean;
}

export interface RunWranglerResult {
  success: boolean;
  /** Captured stdout. Empty unless `captureOutput` was set and it succeeded. */
  stdout: string;
  /**
   * Best-effort failure description: captured stderr when `captureOutput` was
   * set, else the thrown error's message. Empty on success.
   */
  reason: string;
}

// Side-effecting wrangler invocation shared by the d1 and secret executors,
// the binding generator's post-flush typegen, and provisioning. Isolated so
// callers can be unit-tested by mocking this one module, and so the pure
// arg-builders stay free of I/O. By default stdio is inherited so interactive
// prompts (e.g. `wrangler secret put`) and wrangler's own error output reach
// the user; pass `captureOutput` to pipe stdout/stderr instead.
export function runWrangler(
  args: string[],
  cwd: string,
  options: RunWranglerOptions = {}
): RunWranglerResult {
  const captureOutput = options.captureOutput ?? false;
  try {
    const stdout = execFileSync('wrangler', args, {
      cwd,
      stdio: captureOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      encoding: 'utf-8',
    });
    return { success: true, stdout: stdout ?? '', reason: '' };
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
    const stderr =
      e && typeof e === 'object' && 'stderr' in e
        ? String((e as { stderr?: unknown }).stderr ?? '').trim()
        : '';
    const reason = stderr || (e instanceof Error ? e.message : String(e));
    return { success: false, stdout: '', reason };
  }
}
