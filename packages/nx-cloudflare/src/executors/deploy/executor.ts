import { DeployExecutorSchema } from './schema';
import { ExecutorContext } from '@nx/devkit';
import { spawn } from 'child_process';
import { createCliOptions } from '../../utils/create-cli-options';
import { getProjectCwd } from '../../utils/project-paths';
import { resolveWranglerBin } from '../../utils/wrangler';

export default async function deployExecutor(
  options: DeployExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const cwd = getProjectCwd(context);
  const args = createCliOptions({ ...options });

  const p = spawn(process.execPath, [resolveWranglerBin(), 'deploy', ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd,
  });
  p.stdout?.on('data', (message) => {
    process.stdout.write(message);
  });
  p.stderr?.on('data', (message) => {
    process.stderr.write(message);
  });

  return new Promise<{ success: boolean }>((resolve, reject) => {
    // Without this, a child that fails to spawn never emits 'close' and the
    // deploy would hang forever (and the 'error' event would throw uncaught).
    p.once('error', (err) =>
      reject(new Error(`Failed to run Wrangler: ${err.message}`))
    );
    p.once('close', (code) => {
      resolve({ success: code === 0 });
    });
  });
}
