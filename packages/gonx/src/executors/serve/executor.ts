import { ExecutorContext } from '@nx/devkit';
import { executeCommand, extractProjectRoot } from '../../utils';
import { ServeExecutorSchema } from './schema';

/**
 * This executor runs a Go program using the `go run` command.
 *
 * @param options options passed to the executor
 * @param context context passed to the executor
 */
export default async function runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  return executeCommand(buildParams(options, context), {
    cwd: extractProjectRoot(context),
    env: options.env,
    executable: options.cmd ?? 'go',
  });
}

const buildParams = (
  options: ServeExecutorSchema,
  context: ExecutorContext
): string[] => {
  const projectName = context.projectName;

  if (!projectName) {
    throw new Error('Project name is not provided');
  }

  const projectRoot =
    context.projectsConfigurations.projects[context.projectName]?.root;

  if (!projectRoot) {
    throw new Error(`Cannot find project root for ${context.projectName}`);
  }

  return ['run', '.', ...(options.args ?? [])];
};
