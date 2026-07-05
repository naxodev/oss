import { ExecutorContext } from '@nx/devkit';
import { executeCommand, extractCWD, getRunPath } from '../../utils';
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
  return executeCommand(buildParams(options), {
    cwd: extractCWD(options, context),
    env: options.env,
    executable: options.cmd ?? 'go',
  });
}

const buildParams = (options: ServeExecutorSchema): string[] => {
  return ['run', getRunPath(options), ...(options.args ?? [])];
};
