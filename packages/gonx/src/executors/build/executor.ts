import { ExecutorContext } from '@nx/devkit';
import {
  buildStringFlagIfValid,
  executeCommand,
  extractProjectRoot,
} from '../../utils';
import { BuildExecutorSchema } from './schema';

/**
 * This executor builds an executable using the `go build` command.
 *
 * @param options options passed to the executor
 * @param context context passed to the executor
 */
export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  return executeCommand(buildParams(options, context), {
    cwd: extractProjectRoot(context),
    env: options.env,
    executable: options.compiler ?? 'go',
  });
}

const buildParams = (
  options: BuildExecutorSchema,
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

  return [
    'build',
    '-o',
    buildOutputPath(extractProjectRoot(context), options.outputPath),
    ...buildStringFlagIfValid('-buildmode', options.buildMode),
    ...(options.flags ?? []),
    '.',
  ];
};

/**
 * Builds the output path of the executable based on the project root.
 *
 * @param projectRoot project root
 * @param customPath custom path to use first
 */
const buildOutputPath = (projectRoot: string, customPath?: string): string => {
  const extension = process.platform === 'win32' ? '.exe' : '';
  return (customPath ?? `dist/${projectRoot}`) + extension;
};
