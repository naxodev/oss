import { Tree, logger, formatFiles, generateFiles } from '@nx/devkit';
import { execSync } from 'child_process';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { GoBlueprintGeneratorSchema } from './schema';
import { normalizeOptions } from '../../utils/normalize-options';
import { initGenerator } from '../init/generator';

/**
 * Validates that the go-blueprint binary is installed and available
 */
function validateGoBlueprintInstallation(): void {
  try {
    execSync('go-blueprint version', { stdio: 'ignore' });
  } catch (error) {
    logger.error(
      'go-blueprint is not installed or not available in PATH.\n' +
        'Please install go-blueprint first:\n' +
        '  go install github.com/melkeydev/go-blueprint@latest\n' +
        'Or visit https://docs.go-blueprint.dev/ for installation instructions.'
    );
    throw new Error('go-blueprint binary not found');
  }
}

/**
 * Builds the go-blueprint command with the provided options
 */
function buildGoBlueprintCommand(
  projectName: string,
  blueprintOptions: GoBlueprintGeneratorSchema
): string[] {
  const command = ['go-blueprint', 'create'];

  // Add required flags
  command.push('--name', projectName);
  command.push('--framework', blueprintOptions.framework);
  command.push('--driver', blueprintOptions.driver);
  command.push('--git', blueprintOptions.git);

  // Add advanced features if specified
  if (blueprintOptions.feature && blueprintOptions.feature.length > 0) {
    command.push('--advanced');
    blueprintOptions.feature.forEach((feature) => {
      command.push('--feature', feature);
    });
  }

  return command;
}

/**
 * Executes go-blueprint command in the specified directory
 */
function executeGoBlueprintCommand(
  command: string[],
  executionDir: string
): void {
  const fullCommand = command.join(' ');

  try {
    execSync(fullCommand, {
      cwd: executionDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        TERM: 'dumb',
        CI: 'true',
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      },
    });
  } catch (error) {
    throw new Error(`go-blueprint execution failed: ${error.message}`);
  }
}

export async function goBlueprintGenerator(
  tree: Tree,
  options: GoBlueprintGeneratorSchema
) {
  // Validate go-blueprint installation first
  validateGoBlueprintInstallation();

  // Normalize options using the standard utility
  const normalizedOptions = await normalizeOptions(
    tree,
    options,
    'application'
  );

  // Initialize the workspace (adds necessary dependencies, etc.)
  await initGenerator(tree, {
    skipFormat: true,
    addGoDotWork: options.addGoDotWork,
  });

  // Extract project name from normalized options
  const pathSegments = normalizedOptions.projectRoot
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
    const command = buildGoBlueprintCommand(projectName, options);
    executeGoBlueprintCommand(command, filesDir);

    // Use generateFiles to copy from the temporary files directory to the project root
    generateFiles(tree, tempProjectDir, normalizedOptions.projectRoot, {
      ...options,
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
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default goBlueprintGenerator;
