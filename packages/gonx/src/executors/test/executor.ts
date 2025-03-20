import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { TestExecutorSchema } from './schema';
import { execSync } from 'child_process';
import * as path from 'path';

export function testExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  return runExecutor(options, context);
}

const runExecutor: PromiseExecutor<TestExecutorSchema> = async (
  options: TestExecutorSchema,
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
  
  // Construct the test command
  let testCommand = 'go test';
  
  // Add test options
  if (options.cover) {
    testCommand += ' -cover';
  }
  
  if (options.coverProfile) {
    testCommand += ` -coverprofile=${options.coverProfile}`;
  }
  
  if (options.race) {
    testCommand += ' -race';
  }
  
  if (options.run) {
    testCommand += ` -run=${options.run}`;
  }
  
  if (options.verbose) {
    testCommand += ' -v';
  }
  
  if (options.count) {
    testCommand += ` -count=${options.count}`;
  }
  
  if (options.timeout) {
    testCommand += ` -timeout=${options.timeout}`;
  }
  
  // Add ./... to run tests in all packages in the project
  testCommand += ' ./...';
  
  try {
    logger.info(`Executing: ${testCommand}`);
    
    // Execute the command
    execSync(testCommand, {
      cwd: path.join(context.root, projectRoot),
      stdio: 'inherit',
    });
    
    return {
      success: true
    };
  } catch (error) {
    logger.error(`Error during testing: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

export default runExecutor;
