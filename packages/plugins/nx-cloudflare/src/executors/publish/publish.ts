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

  const { stdout, stderr } = await promisify(exec)(`wrangler deploy`, {
    cwd: projectRoot,
  });
  console.log(stdout);
  console.error(stderr);

  const success = !stderr;
  return { success };
}
