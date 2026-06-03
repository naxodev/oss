import { DeployExecutorSchema } from './schema';
import { ExecutorContext } from '@nx/devkit';
import { spawn } from 'child_process';
import { createCliOptions } from '../../utils/create-cli-options';
import { getProjectCwd } from '../../utils/project-paths';

export default async function deployExecutor(
  options: DeployExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const cwd = getProjectCwd(context);
  const args = createCliOptions({ ...options });
  const p = runWrangler(args, cwd);
  p.stdout.on('data', (message) => {
    process.stdout.write(message);
  });
  p.stderr.on('data', (message) => {
    process.stderr.write(message);
  });

  return new Promise<{ success: boolean }>((resolve) => {
    p.on('close', (code) => {
      resolve({ success: code === 0 });
    });
  });
}

function runWrangler(args: string[], cwd: string) {
  try {
    const wranglerBin = require.resolve('wrangler/bin/wrangler');

    return spawn(process.execPath, [wranglerBin, 'deploy', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
    });
  } catch (e) {
    console.error(e);
    throw new Error('Unable to run Wrangler. Is Wrangler installed?');
  }
}
