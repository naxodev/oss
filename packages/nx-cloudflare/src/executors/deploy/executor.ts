import { DeployExecutorSchema } from './schema';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import { fork } from 'child_process';
import { createCliOptions } from '../../utils/create-cli-options';
import { resolve as pathResolve } from 'path';

export default async function deployExecutor(
  options: DeployExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectRoot =
    context.projectGraph?.nodes?.[context?.projectName]?.data?.root;

  if (!projectRoot) {
    throw new Error(
      `Unable to find the Project Root for ${context.projectName}. Is it set in the project.json?`
    );
  }

  const args = createCliOptions({ ...options });
  const cwd = pathResolve(workspaceRoot, projectRoot);
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

    return fork(wranglerBin, ['deploy', ...args], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd,
    });
  } catch (e) {
    console.error(e);
    throw new Error('Unable to run Wrangler. Is Wrangler installed?');
  }
}
