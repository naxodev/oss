import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { createTestProject } from '@oss/internal/util-e2e';

describe('plugins-nx-cloudflare', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugin built with the latest source code into the test repo
    execSync(`npm install @naxodev/nx-cloudflare@e2e`, {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });
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
});
