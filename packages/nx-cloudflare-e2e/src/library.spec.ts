import { uniq } from '@nx/plugin/testing';
import {
  createTestProject,
  cleanup,
  runCLI,
  showProject,
} from '@naxodev/e2e-utils';

describe('Cloudflare Worker Library', () => {
  let priorFlatConfig: string | undefined;

  beforeAll(() => {
    // Nx 22.7 defaults generated projects to ESLint flat config, whose config
    // imports `typescript-eslint`. The bare e2e workspace never installs it, so
    // force the eslintrc format used across this repo to keep `nx lint`
    // resolvable (mirrors the plugin's generator unit-test expectations).
    // Captured/restored so the override doesn't leak into other suites in the
    // shared jest worker.
    priorFlatConfig = process.env.ESLINT_USE_FLAT_CONFIG;
    process.env.ESLINT_USE_FLAT_CONFIG = 'false';
    // Create a real Nx workspace and install @naxodev/nx-cloudflare from the
    // local registry — exercises the published-tarball install path (peerDeps,
    // exports) that the legacy ensureNxProject fixture never touched.
    createTestProject('nx-cloudflare');
  }, 300_000);

  afterAll(() => {
    if (priorFlatConfig === undefined) {
      delete process.env.ESLINT_USE_FLAT_CONFIG;
    } else {
      process.env.ESLINT_USE_FLAT_CONFIG = priorFlatConfig;
    }
    cleanup();
  });

  it('should be able to generate a library', () => {
    const workerlib = uniq('workerlib');

    runCLI(
      `generate @naxodev/nx-cloudflare:lib --name=${workerlib} --directory="libs/${workerlib}" --unitTestRunner="none"`
    );

    // Reset the Nx daemon so the freshly generated project is in the graph.
    runCLI('reset');

    // Assert via the project graph rather than a fixed manifest file: under
    // Nx's TS-solution setup `@nx/js:library` emits package.json-based config,
    // not project.json, so a file check would be format-coupled and brittle.
    expect(showProject(workerlib).root).toBe(`libs/${workerlib}`);
  }, 120_000);

  it('should be able to generate a library without specifying a directory', () => {
    const workerlib = uniq('workerlib');

    runCLI(
      `generate @naxodev/nx-cloudflare:lib ${workerlib} --unitTestRunner="none"`
    );

    // Reset the Nx daemon so the freshly generated project is in the graph.
    runCLI('reset');

    // Default directory should be the library name.
    expect(showProject(workerlib).root).toBe(workerlib);
  }, 120_000);
});
