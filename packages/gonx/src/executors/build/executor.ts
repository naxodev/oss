import { ExecutorContext } from '@nx/devkit';
import {
  buildStringFlagIfValid,
  executeCommand,
  extractCWD,
  getProjectRoot,
  getRunPath,
} from '../../utils';
import { BuildExecutorSchema } from './schema';
import { join } from 'node:path';

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
    cwd: extractCWD(options, context),
    env: options.env,
    executable: options.compiler ?? 'go',
  });
}

const buildParams = (
  options: BuildExecutorSchema,
  context: ExecutorContext
): string[] => {
  const projectRoot = getProjectRoot(context);

  return [
    'build',
    '-o',
    buildOutputPath(context.root, projectRoot, options.outputPath),
    ...buildStringFlagIfValid('-buildmode', options.buildMode),
    ...(options.flags ?? []),
    getRunPath(options),
  ];
};

/**
 * Builds the output path of the executable based on the project root.
 *
 * @param projectRoot project root
 * @param customPath custom path to use first
 */
function buildOutputPath(
  workspaceRoot: string,
  projectRoot: string,
  customPath?: string
): string {
  const normalizedCustomPath = customPath && join(workspaceRoot, customPath);
  const defaultPath = join(workspaceRoot, `dist/${projectRoot}/`);

  return normalizedCustomPath || defaultPath;
}
