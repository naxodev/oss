import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { LintExecutorSchema } from './schema';
import { execSync } from 'child_process';
import * as path from 'path';

export function lintExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  return runExecutor(options, context);
}

const runExecutor: PromiseExecutor<LintExecutorSchema> = async (
  options: LintExecutorSchema,
  context: ExecutorContext
) => {
  const projectName = context.projectName;

  if (!projectName) {
    throw new Error('No project name provided');
  }

  const projectRoot =
    context.projectsConfigurations.projects[projectName]?.root;

  if (!projectRoot) {
    throw new Error(`Cannot find project root for ${projectName}`);
  }

  // Set default linter to go fmt if not specified
  const linter = options.linter || 'go fmt';

  // Construct the lint command
  let lintCommand = linter;

  // Add arguments if specified
  if (options.args && options.args.length > 0) {
    lintCommand += ` ${options.args.join(' ')}`;
  }

  // Add ./... to run lint in all packages in the project
  lintCommand += ' ./...';

  try {
    logger.info(`Executing: ${lintCommand}`);

    // Execute the command
    execSync(lintCommand, {
      cwd: path.join(context.root, projectRoot),
      stdio: 'inherit',
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error(`Error during linting: ${error.message}`);
    throw new Error(error.message);
  }
};

export default runExecutor;
