import { Tree, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import { GoBlueprintGeneratorSchema } from './schema';

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

export async function goBlueprintGenerator(
  tree: Tree,
  options: GoBlueprintGeneratorSchema
) {
  validateGoBlueprintInstallation();
}

export default goBlueprintGenerator;
