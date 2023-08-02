import { ExecutorContext } from '@nx/devkit';
import { Schema } from './schema';
import { exec } from 'child_process';
import { promisify } from 'util';

export default async function serveExecutor(
  options: Schema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectRoot =
    context.projectsConfigurations.projects[context.projectName].root;

  const wranglerOptions = [];

  if (options.port) {
    wranglerOptions.push(`--port=${options.port}`);
  }

  const { stdout, stderr } = await promisify(exec)(
    `wrangler dev ${wranglerOptions.join(' ')}`,
    {
      cwd: projectRoot,
    }
  );
  console.log(stdout);
  console.error(stderr);

  const success = !stderr;
  return { success };
}
