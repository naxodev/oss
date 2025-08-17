import {
  uniq,
  runNxCommand,
  ensureNxProject,
  cleanup,
  fileExists,
  tmpProjPath,
  readFile,
} from '@nx/plugin/testing';
import { join } from 'path';

const unnecessaryFiles = ['.air.toml', '.gitignore', 'README.md', 'Makefile'];

describe('Go Blueprint Generator', () => {
  beforeAll(() => {
    if (process.env.CI) {
      console.log('Skipping Go Blueprint tests in CI due to TTY requirements');
      return;
    }
  });
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support
    runNxCommand('generate @naxodev/gonx:init');
  });

  afterEach(() => cleanup());

  it('should generate the projects in the workspace root when the go-blueprint generator is run', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const projectName = uniq('gobp');

    // Try to run the generator with minimal required options
    const result = runNxCommand(
      `generate @naxodev/gonx:go-blueprint ${projectName} --framework=gin --driver=sqlite --git=skip`
    );

    expect(result).not.toContain('go-blueprint binary not found');

    // Check that go.mod was created in the project root
    expect(
      fileExists(join(tmpProjPath(), `${projectName}/go.mod`))
    ).toBeTruthy();

    // Verify go.mod content contains the correct module name
    const goModContent = readFile(join(tmpProjPath(), `${projectName}/go.mod`));
    expect(goModContent).toContain(`module ${projectName}`);

    // Check that main.go was also created in the project root
    expect(
      fileExists(join(tmpProjPath(), `${projectName}/cmd/api/main.go`))
    ).toBeTruthy();

    // Should not create extra Go BluePrint files
    unnecessaryFiles.forEach((file) => {
      const filePath = join(tmpProjPath(), `${projectName}/${file}`);
      expect(fileExists(filePath)).toBeFalsy();
    });

    console.log(`✅ go.mod and main.go created correctly in ${projectName}/`);
  }, 60_000);

  it('should generate the projects in a nested folder when the go-blueprint generator is run', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const projectName = uniq('gobp');

    // Try to run the generator with minimal required options
    runNxCommand(
      `generate @naxodev/gonx:go-blueprint --directory="apps/${projectName}" --framework=gin --driver=sqlite --git=skip`
    );

    // Check that go.mod was created in the project root
    expect(
      fileExists(join(tmpProjPath(), `apps/${projectName}/go.mod`))
    ).toBeTruthy();

    // Verify go.mod content contains the correct module name
    const goModContent = readFile(
      join(tmpProjPath(), `apps/${projectName}/go.mod`)
    );
    expect(goModContent).toContain(`module ${projectName}`);

    // Check that main.go was also created in the project root
    expect(
      fileExists(join(tmpProjPath(), `apps/${projectName}/cmd/api/main.go`))
    ).toBeTruthy();

    // Should not create extra Go BluePrint files
    unnecessaryFiles.forEach((file) => {
      const filePath = join(tmpProjPath(), `apps/${projectName}/${file}`);
      expect(fileExists(filePath)).toBeFalsy();
    });

    console.log(`✅ go.mod and main.go created correctly in ${projectName}/`);
  }, 60_000);

  it('should support --dry-run without creating actual files', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const projectName = uniq('gobp');

    // Run generator with --dry-run flag
    const result = runNxCommand(
      `generate @naxodev/gonx:go-blueprint ${projectName} --framework=gin --driver=sqlite --git=skip --dry-run`
    );

    // Should not contain error messages
    expect(result).not.toContain('go-blueprint binary not found');

    // With --dry-run, no actual files should be created in the workspace
    expect(
      fileExists(join(tmpProjPath(), `${projectName}/go.mod`))
    ).toBeFalsy();
    expect(
      fileExists(join(tmpProjPath(), `${projectName}/cmd/api/main.go`))
    ).toBeFalsy();

    // But the output should show what would be generated
    expect(result).toContain('CREATE');

    console.log(
      `✅ --dry-run completed without creating files for ${projectName}`
    );
  }, 30_000);
});
