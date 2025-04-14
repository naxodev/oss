import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { ServeExecutorSchema } from './schema';
import { spawn } from 'child_process';
import * as path from 'path';

export function serveExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  return runExecutor(options, context);
}

const runExecutor: PromiseExecutor<ServeExecutorSchema> = async (
  options: ServeExecutorSchema,
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

  // Default cmd to 'go' if not specified
  const cmd = options.cmd || 'go';

  // Construct the serve command
  const serveArgs = ['run', options.main];

  // Add extra args if specified
  if (options.args && options.args.length > 0) {
    serveArgs.push(...options.args);
  }

  // Set working directory
  const cwd = options.cwd
    ? path.join(context.root, options.cwd)
    : path.join(context.root, projectRoot);

  // Set environment variables
  const env = { ...process.env, ...options.env };

  try {
    logger.info(`Executing: ${cmd} ${serveArgs.join(' ')}`);

    // Create a promise that resolves when the process is terminated
    return new Promise((resolve, reject) => {
      const childProcess = spawn(cmd, serveArgs, {
        cwd,
        env,
        stdio: 'inherit',
      });

      // Handle process exit
      childProcess.on('exit', (code) => {
        if (code === 0 || code === null) {
          resolve({ success: true });
        } else {
          reject(`Process exited with code ${code}`);
        }
      });

      // Handle process error
      childProcess.on('error', (err) => {
        logger.error(`Error during serve: ${err.message}`);
        reject(err.message);
      });

      // Handle interruption signals
      const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'] as const;
      signals.forEach((signal) => {
        process.on(signal, () => {
          if (!childProcess.killed) {
            childProcess.kill(signal);
          }
        });
      });
    });
  } catch (error) {
    logger.error(`Error during serve: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default runExecutor;
