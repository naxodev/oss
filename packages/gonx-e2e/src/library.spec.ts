import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { uniq, fileExists, tmpProjPath } from '@nx/plugin/testing';
import { createTestProject, cleanup, runCLI } from '@naxodev/e2e-utils';
import { join } from 'path';

describe('Go Libraries', () => {
  beforeAll(() => {
    // Create a real Nx workspace and install @naxodev/gonx from the local
    // registry — exercises the published-tarball install path (peerDeps,
    // exports) that the legacy ensureNxProject fixture never touched.
    createTestProject('gonx');

    // Initialize Go support first with go.work support
    runCLI('generate @naxodev/gonx:init --addGoDotWork');
  }, 300_000);

  afterAll(() => cleanup());

  it('should be able to generate a Go library', async () => {
    const golib = uniq('golib');

    runCLI(`generate @naxodev/gonx:library ${golib}`);

    // Verify the library files were created
    expect(
      fileExists(join(tmpProjPath(), `${golib}/${golib}.go`))
    ).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${golib}/go.mod`))).toBeTruthy();
  }, 30_000);

  it('should be able to generate a library with a specific directory', async () => {
    const golib = uniq('golib');

    runCLI(
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

    runCLI(`generate @naxodev/gonx:library ${golib}`);

    // Verify the library files were created
    expect(
      fileExists(join(tmpProjPath(), `${golib}/${golib}.go`))
    ).toBeTruthy();

    // Reset Nx daemon to pick up new project
    runCLI('reset');

    // Run tidy
    const tidyResults = runCLI(`tidy ${golib}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${golib}`
    );

    // Run lint
    const lintResults = runCLI(`lint ${golib}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${golib}`
    );

    // Run test
    const testResults = runCLI(`test ${golib}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${golib}`
    );
  }, 120_000);
});
