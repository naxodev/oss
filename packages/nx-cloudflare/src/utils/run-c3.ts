import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { buildC3Command, BuildC3CommandOptions } from './c3';

// Side-effecting C3 invocation: spawns create-cloudflare on the real filesystem
// (Nx generators operate on a virtual Tree, so the scaffold is produced in a
// temp dir and imported afterwards). Kept in its own module so generator unit
// tests can mock it without touching the pure buildC3Command. Verified by e2e.
export function runC3(options: BuildC3CommandOptions): void {
  const { command, args } = buildC3Command(options);
  execFileSync(command, args, {
    cwd: dirname(options.directory),
    stdio: 'inherit',
  });
}
