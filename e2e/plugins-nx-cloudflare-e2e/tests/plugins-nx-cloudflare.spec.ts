import { execSync } from 'child_process';
import { rmSync } from 'fs';

import { createTestProject, installPlugin } from '../utils';
import { runNxCommandAsync, uniq } from '@nx/plugin/testing';

describe('plugins-nx-cloudflare', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();
    installPlugin(projectDirectory, 'nx-cloudflare');
  });

  afterAll(() => {
    // Cleanup the test project
    rmSync(projectDirectory, {
      recursive: true,
      force: true,
    });
  });

  it('should be installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('npm ls @naxodev/nx-cloudflare', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });
  describe('nx-cloudflare test worker app', () => {
    it('should test a cloudflare worker application', async () => {
      const plugin = uniq('nx-cloudflare');
      await runNxCommandAsync(`generate @naxodev/nx-cloudflare:app ${plugin}`);

      const result = await runNxCommandAsync(`test ${plugin}`);
      expect(result.stdout).toContain(
        `Successfully ran target test for project ${plugin}`
      );
    });

    it('should be able to run linter', async () => {
      const plugin = uniq('nx-cloudflarelint');
      await runNxCommandAsync(
        `generate @naxodev/nx-cloudflare:app ${plugin} --e2eTestRunner='none' --unitTestRunner='none'`
      );

      const result = await runNxCommandAsync(`lint ${plugin}`);
      expect(result.stdout).toContain('All files pass linting');
    });
  });
});
