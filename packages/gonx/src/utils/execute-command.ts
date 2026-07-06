import { ExecutorContext, logger } from '@nx/devkit';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileExists } from 'nx/src/utils/fileutils';
import { BuildExecutorSchema } from '../executors/build/schema';
import { ServeExecutorSchema } from '../executors/serve/schema';

export type RunGoOptions = {
  executable?: string;
  cwd?: string;
  env?: { [key: string]: string };
};

/**
 * Get the project root from the executor context, throwing a clear error
 * instead of an opaque TypeError when the project name or its configuration
 * is missing.
 *
 * @param context the executor context
 */
export const getProjectRoot = (context: ExecutorContext): string => {
  const projectName = context.projectName;
  if (!projectName) {
    throw new Error('Project name is not provided');
  }

  const projectRoot =
    context.projectsConfigurations?.projects[projectName]?.root;
  if (!projectRoot) {
    throw new Error(`Cannot find project root for ${projectName}`);
  }

  return projectRoot;
};

/**
 * Resolves the `go` run path: the current file when `main` is provided,
 * otherwise every package in the project.
 *
 * @param options options carrying an optional `main` entry point
 */
export const getRunPath = (options: { main?: string }): string =>
  options.main ? '.' : './...';

/**
 * Execute and log a command, then return the result to executor.
 *
 * @param parameters the parameters of the command
 * @param options the options of the command
 */
export const executeCommand = async (
  parameters: string[] = [],
  options: RunGoOptions = {}
): Promise<{ success: boolean }> => {
  try {
    const { executable = 'go', cwd = null, env = {} } = options;
    // Merge into a fresh object rather than mutating process.env: this
    // executor can run many times inside the long-lived Nx daemon, and a
    // mutation would leak env vars from one run into the next.
    const mergedEnv = { ...process.env, ...env };

    logger.info(`Executing command: ${[executable, ...parameters].join(' ')}`);

    // `executable` may be a multi-word string (e.g. the lint executor's
    // `linter` option defaults to "go fmt"), so split it into the actual
    // file to spawn plus any leading tokens, which get prepended to the
    // parameters argv.
    const [file, ...leadingArgs] = executable.split(/\s+/).filter(Boolean);

    // execFileSync takes the executable and its arguments as a separate
    // argv array (no shell involved), so option values are never subject to
    // shell parsing/quoting/injection the way a joined command string would be.
    execFileSync(file, [...leadingArgs, ...parameters], {
      cwd,
      env: mergedEnv,
      stdio: [0, 1, 2],
    });

    return { success: true };
  } catch (error) {
    logger.error(error);
    return { success: false };
  }
};

/**
 * Add a flag to an array of parameter if it is enabled.
 *
 * @param flag the flag to add
 * @param enabled true if flag should be added
 */
export const buildFlagIfEnabled = (flag: string, enabled: boolean): string[] =>
  enabled ? [flag] : [];

/**
 * Add a string flag to an array of parameter if it is valid.
 *
 * @param flag the flag to add
 * @param value the value of the flag
 */
export const buildStringFlagIfValid = (
  flag: string,
  value?: string
): string[] => (value ? [`${flag}=${value}`] : []);

/**
 * Extracts the current working directory (CWD) for the build process.
 * If the 'main' option is provided, returns the directory containing the main.go file.
 * Otherwise, returns the project root directory.
 *
 * @param options - The build executor schema options.
 * @param context - The executor context.
 * @returns The resolved CWD path.
 */
export function extractCWD(
  options: BuildExecutorSchema | ServeExecutorSchema,
  context: ExecutorContext
) {
  const projectRoot = getProjectRoot(context);
  const projectName = context.projectName;

  if (options.main) {
    const mainFilePath = join(projectRoot, options.main);
    if (!fileExists(mainFilePath)) {
      throw new Error(
        `Main file ${options.main} does not exist in project ${projectName}`
      );
    }
    // Return the directory containing the main.go file
    return dirname(mainFilePath);
  }

  return projectRoot;
}
