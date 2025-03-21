import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { TidyExecutorSchema } from './schema';
import { execSync } from 'child_process';
import * as path from 'path';

export function tidyExecutor(
  options: TidyExecutorSchema,
  context: ExecutorContext
) {
  return runExecutor(options, context);
}

const runExecutor: PromiseExecutor<TidyExecutorSchema> = async (
  options: TidyExecutorSchema,
  context: ExecutorContext
) => {
  const projectName = context.projectName;
  
  if (!projectName) {
    throw new Error('No project name provided');
  }
  
  const projectRoot = context.projectsConfigurations.projects[projectName]?.root;
  
  if (!projectRoot) {
    throw new Error(`Cannot find project root for ${projectName}`);
  }
  
  // Construct the tidy command
  let tidyCommand = 'go mod tidy';
  
  // Add verbose flag if specified
  if (options.verbose) {
    tidyCommand += ' -v';
  }
  
  try {
    logger.info(`Executing: ${tidyCommand}`);
    
    // Execute the command
    execSync(tidyCommand, {
      cwd: path.join(context.root, projectRoot),
      stdio: 'inherit',
    });
    
    return {
      success: true
    };
  } catch (error) {
    logger.error(`Error during go mod tidy: ${error.message}`);
    throw new Error(error.message);
  }
};

export default runExecutor;
