import { ExecutorContext } from '@nx/devkit';
import { executeCommand, extractCWD } from '../../utils';
import { GenerateExecutorSchema } from './schema';

/**
 * This executor runs code generation using the `go generate` command.
 *
 * @param options options passed to the executor
 * @param context context passed to the executor
 */
export default async function runExecutor(
  options: GenerateExecutorSchema,
  context: ExecutorContext
) {
  return executeCommand(buildParams(options), {
    cwd: extractCWD(options, context),
    env: options.env,
    executable: options.compiler ?? 'go',
  });
}

const buildParams = (options: GenerateExecutorSchema): string[] => {
  return ['generate', ...(options.flags ?? []), './...'];
};
