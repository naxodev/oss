import { ExecutorContext, logger } from '@nx/devkit';
import { executeCommand, extractProjectRoot } from '../../utils';
import { ServeExecutorSchema } from './schema';
import { relative } from 'path';
import { findMainGoFiles } from '../../utils/find-main-go-files';

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
  // Use main from options if provided, otherwise try to find main.go file
  let mainFile = options.main;

  const projectName = context.projectName;

  if (!projectName) {
    throw new Error('Project name is not provided');
  }

  const projectRoot =
    context.projectsConfigurations.projects[context.projectName]?.root;

  if (!projectRoot) {
    throw new Error(`Cannot find project root for ${context.projectName}`);
  }

  if (!mainFile) {
    const mainGoFiles = findMainGoFiles(projectRoot, context.root);

    if (!mainGoFiles?.length) {
      throw new Error(
        `Cannot find main.go file or main package in ${projectRoot} or its subdirectories`
      );
    }

    mainFile = mainGoFiles[0];
    logger.debug(`Found main.go file at: ${mainFile}`);
  }

  // Since we're running from the project root, adjust the main file path to be relative to project root
  mainFile = relative(projectRoot, mainFile);

  return ['run', mainFile, ...(options.args ?? [])];
};
