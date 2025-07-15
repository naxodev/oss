import {
  uniq,
  runNxCommand,
  ensureNxProject,
  cleanup,
} from '@nx/plugin/testing';
import { execSync } from 'child_process';

describe('Go Blueprint Generator', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support
    runNxCommand('generate @naxodev/gonx:init');
  });

  afterEach(() => cleanup());

  it('should validate go-blueprint binary is installed before running generator', async () => {
    const projectName = uniq('gobp');

    // Check if go-blueprint is installed
    let goBlueprintInstalled = false;
    try {
      execSync('go-blueprint version', { stdio: 'ignore' });
      goBlueprintInstalled = true;
    } catch {
      goBlueprintInstalled = false;
    }

    if (goBlueprintInstalled) {
      // If go-blueprint is installed, the generator should work
      const result = runNxCommand(
        `generate @naxodev/gonx:go-blueprint ${projectName}`
      );
      expect(result).not.toContain('go-blueprint binary not found');
    } else {
      // If go-blueprint is not installed, expect validation error
      expect(() => {
        runNxCommand(`generate @naxodev/gonx:go-blueprint ${projectName}`);
      }).toThrow();
    }
  }, 30_000);

  it('should show helpful error message when go-blueprint is not installed', async () => {
    const projectName = uniq('gobp');

    // Check if go-blueprint is installed
    let goBlueprintInstalled = false;
    try {
      execSync('go-blueprint version', { stdio: 'ignore' });
      goBlueprintInstalled = true;
    } catch {
      goBlueprintInstalled = false;
    }

    if (!goBlueprintInstalled) {
      // Test the error message when go-blueprint is not available
      let errorOutput = '';
      try {
        runNxCommand(`generate @naxodev/gonx:go-blueprint ${projectName}`);
      } catch (error) {
        errorOutput = error.toString();
      }

      expect(errorOutput).toContain('go-blueprint is not installed');
      expect(errorOutput).toContain(
        'go install github.com/melkeydev/go-blueprint@latest'
      );
      expect(errorOutput).toContain('https://docs.go-blueprint.dev/');
    } else {
      console.log('Skipping test - go-blueprint is installed on this system');
    }
  }, 30_000);
});
