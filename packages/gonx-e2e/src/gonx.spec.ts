import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

describe('gonx', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugin built with the latest source code into the test repo
    execSync(`pnpm add -D @naxodev/gonx@e2e`, {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });
  });

  afterAll(() => {
    if (projectDirectory) {
      // Cleanup the test project
      rmSync(projectDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('should be installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('pnpm ls --depth 100 @naxodev/gonx', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  it('should generate a Go application', () => {
    execSync('npx nx g @naxodev/gonx:init', {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    // Generate a Go application
    execSync('npx nx g @naxodev/gonx:application --name my-go-app', {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    // Verify the application files were created
    expect(existsSync(join(projectDirectory, 'apps/my-go-app/main.go'))).toBeTruthy();
    expect(existsSync(join(projectDirectory, 'apps/my-go-app/go.mod'))).toBeTruthy();
  });

  it('should generate a Go library', () => {
    // Generate a Go library
    execSync('npx nx g @naxodev/gonx:library --name my-go-lib', {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    // Verify the library files were created
    expect(existsSync(join(projectDirectory, 'libs/my-go-lib/mygolib.go'))).toBeTruthy();
    expect(existsSync(join(projectDirectory, 'libs/my-go-lib/go.mod'))).toBeTruthy();
  });

  it('should run the build executor', () => {
    // Run the build executor
    execSync('npx nx build my-go-app', {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    // Skip verification as the output path might vary by OS
    // The test will fail if the build executor fails
  });

  it('should run the tidy executor', () => {
    // Run the tidy executor
    execSync('npx nx tidy my-go-app', {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });
  });
});

/**
 * Creates a test project with create-nx-workspace and installs the plugin
 * @returns The directory where the test project was created
 */
function createTestProject() {
  const projectName = 'test-project';
  const projectDirectory = join(process.cwd(), 'tmp', projectName);

  // Ensure projectDirectory is empty
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  execSync(
    `pnpm dlx create-nx-workspace@latest ${projectName} --preset apps --nxCloud=skip --no-interactive`,
    {
      cwd: dirname(projectDirectory),
      stdio: 'inherit',
      env: process.env,
    }
  );
  console.log(`Created test project in "${projectDirectory}"`);

  return projectDirectory;
}
