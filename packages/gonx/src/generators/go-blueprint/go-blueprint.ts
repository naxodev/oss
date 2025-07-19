import { Tree, logger, formatFiles, generateFiles } from '@nx/devkit';
import { fork } from 'child_process';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { GoBlueprintGeneratorSchema } from './schema';
import { normalizeOptions } from '../../utils/normalize-options';
import { initGenerator } from '../init/generator';

/**
 * Gets the path to the go-blueprint binary from the npm package
 */
function getGoBlueprintBinary(): string {
  try {
    return require.resolve('@melkeydev/go-blueprint/bin/go-blueprint');
  } catch (error) {
    logger.error(
      'go-blueprint npm package is not installed.\n' +
        'This should not happen as it is a dependency of this package.'
    );
    throw new Error('go-blueprint binary not found in npm package');
  }
}

/**
 * Builds the go-blueprint command arguments with the provided options
 */
function buildGoBlueprintArgs(
  projectName: string,
  blueprintOptions: GoBlueprintGeneratorSchema
): string[] {
  const args = ['create'];

  // Add required flags
  args.push('--name', projectName);
  args.push('--framework', blueprintOptions.framework);
  args.push('--driver', blueprintOptions.driver);
  args.push('--git', blueprintOptions.git);

  // Add advanced features if specified
  if (blueprintOptions.feature && blueprintOptions.feature.length > 0) {
    args.push('--advanced');
    blueprintOptions.feature.forEach((feature) => {
      args.push('--feature', feature);
    });
  }

  return args;
}

/**
 * Executes go-blueprint command in the specified directory using the npm package binary
 */
function executeGoBlueprintCommand(
  args: string[],
  executionDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const goBlueprintBin = getGoBlueprintBinary();

      const childProcess = fork(goBlueprintBin, args, {
        cwd: executionDir,
        stdio: ['pipe', 'ignore', 'pipe', 'ipc'],
        env: {
          ...process.env,
          TERM: 'dumb',
          CI: 'true',
          NO_COLOR: '1',
          FORCE_COLOR: '0',
        },
      });

      // Forward output to the console
      childProcess.stdout?.on('data', (data) => {
        process.stdout.write(data);
      });

      childProcess.stderr?.on('data', (data) => {
        process.stderr.write(data);
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`go-blueprint execution failed with exit code ${code}`)
          );
        }
      });

      childProcess.on('error', (error) => {
        reject(new Error(`go-blueprint execution failed: ${error.message}`));
      });
    } catch (error) {
      reject(new Error(`Failed to start go-blueprint: ${error.message}`));
    }
  });
}

export async function goBlueprintGenerator(
  tree: Tree,
  schema: GoBlueprintGeneratorSchema
) {
  // Normalize options using the standard utility
  const options = await normalizeOptions(tree, schema, 'application');

  // Initialize the workspace (adds necessary dependencies, etc.)
  await initGenerator(tree, {
    skipFormat: true,
    addGoDotWork: schema.addGoDotWork,
  });

  // Extract project name from normalized options
  const pathSegments = options.projectRoot
    .split('/')
    .filter((segment) => segment.length > 0);
  const projectName = pathSegments[pathSegments.length - 1];

  // Create temporary files directory
  const filesDir = join(__dirname, 'files');
  const tempProjectDir = join(filesDir, projectName);

  try {
    // Create the files directory if it doesn't exist
    if (!existsSync(filesDir)) {
      mkdirSync(filesDir, { recursive: true });
    }

    // Build and execute go-blueprint command in the files directory
    const args = buildGoBlueprintArgs(projectName, schema);
    await executeGoBlueprintCommand(args, filesDir);

    // Use generateFiles to copy from the temporary files directory to the project root
    generateFiles(tree, tempProjectDir, options.projectRoot, {
      ...schema,
      projectName,
      tmpl: '',
    });
  } finally {
    // Clean up the temporary files directory
    if (existsSync(filesDir)) {
      rmSync(filesDir, { recursive: true, force: true });
    }
  }

  // Format files if not skipped
  if (!schema.skipFormat) {
    await formatFiles(tree);
  }
}

export default goBlueprintGenerator;
