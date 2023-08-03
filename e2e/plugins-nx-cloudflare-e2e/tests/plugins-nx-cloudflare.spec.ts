import { execSync } from 'child_process';
import { rmSync } from 'fs';

import { createTestProject, installPlugin } from '../utils';

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
    // pnpm ls will fail if the package is not installed properly
    execSync('pnpm ls @naxodev/nx-cloudflare', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });
});
