import {
  uniq,
  fileExists,
  tmpProjPath,
  runNxCommand,
  ensureNxProject,
  cleanup,
} from '@nx/plugin/testing';
import { join } from 'path';

describe('Go Libraries', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support first with go.work support
    runNxCommand('generate @naxodev/gonx:init --addGoDotWork');
  });

  afterEach(() => cleanup());

  it('should be able to generate a Go library', async () => {
    const golib = uniq('golib');

    runNxCommand(`generate @naxodev/gonx:library ${golib}`);

    // Verify the library files were created
    expect(
      fileExists(join(tmpProjPath(), `${golib}/${golib}.go`))
    ).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${golib}/go.mod`))).toBeTruthy();
  }, 30_000);

  it('should be able to generate a library with a specific directory', async () => {
    const golib = uniq('golib');

    runNxCommand(
      `generate @naxodev/gonx:library --directory="libs/${golib}" --name=${golib}`
    );

    // Verify the library files were created
    expect(
      fileExists(join(tmpProjPath(), `libs/${golib}/${golib}.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `libs/${golib}/go.mod`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to run tidy, lint, and test commands on a Go library', async () => {
    const golib = uniq('golib');

    runNxCommand(`generate @naxodev/gonx:library ${golib}`);

    // Verify the library files were created
    expect(
      fileExists(join(tmpProjPath(), `${golib}/${golib}.go`))
    ).toBeTruthy();

    // Reset Nx daemon to pick up new project
    runNxCommand('reset');

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${golib}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${golib}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${golib}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${golib}`
    );

    // Run test
    const testResults = runNxCommand(`test ${golib}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${golib}`
    );
  }, 120_000);
});
