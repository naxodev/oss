import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';
import { execSync } from 'child_process';
import * as path from 'path';

export function buildExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  return runExecutor(options, context);
}

const runExecutor: PromiseExecutor<BuildExecutorSchema> = async (
  options: BuildExecutorSchema,
  context: ExecutorContext
) => {
  const projectName = context.projectName;
  
  if (!projectName) {
    throw new Error('No project name provided');
  }
  
  const projectRoot = context.workspace.projects[projectName]?.root;
  
  if (!projectRoot) {
    throw new Error(`Cannot find project root for ${projectName}`);
  }
  
  const compiler = options.compiler || 'go';
  
  // Construct the build command
  let buildCommand = `${compiler} build`;
  
  // Add output path if specified
  if (options.outputPath) {
    buildCommand += ` -o ${options.outputPath}`;
  }
  
  // Add build mode if specified
  if (options.buildMode) {
    buildCommand += ` -buildmode=${options.buildMode}`;
  }
  
  // Add flags if specified
  if (options.flags && options.flags.length > 0) {
    buildCommand += ` ${options.flags.join(' ')}`;
  }
  
  // Add the main file path
  buildCommand += ` ${options.main}`;
  
  try {
    logger.info(`Executing: ${buildCommand}`);
    
    // Set up environment variables
    const env = { ...process.env, ...options.env };
    
    // Execute the command
    execSync(buildCommand, {
      cwd: path.join(context.root, projectRoot),
      stdio: 'inherit',
      env
    });
    
    return {
      success: true
    };
  } catch (error) {
    logger.error(`Error during build: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

export default runExecutor;
