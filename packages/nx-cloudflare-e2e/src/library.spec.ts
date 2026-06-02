import {
  uniq,
  fileExists,
  tmpProjPath,
  runNxCommand,
  ensureNxProject,
  cleanup,
} from '@nx/plugin/testing';
import { join } from 'path';

describe('Cloudflare Worker Library', () => {
  beforeEach(() => {
    // Nx 22.7 defaults generated projects to ESLint flat config, whose config
    // imports `typescript-eslint`. The bare e2e workspace never installs it, so
    // force the eslintrc format used across this repo to keep `nx lint`
    // resolvable (mirrors the plugin's generator unit-test expectations).
    process.env.ESLINT_USE_FLAT_CONFIG = 'false';
    ensureNxProject('@naxodev/nx-cloudflare', 'dist/packages/nx-cloudflare');
  });

  afterEach(() => cleanup());

  it('should be able to generate a library', async () => {
    const workerlib = uniq('workerlib');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:lib --name=${workerlib} --directory="libs/${workerlib}" --unitTestRunner="none"`
    );

    // Reset Nx daemon to pick up new project
    runNxCommand('reset');

    expect(
      fileExists(join(tmpProjPath(), `libs/${workerlib}/project.json`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to generate a library without specifying a directory', async () => {
    const workerlib = uniq('workerlib');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:lib ${workerlib} --unitTestRunner="none"`
    );

    // Reset Nx daemon to pick up new project
    runNxCommand('reset');

    // Default directory should be the library name
    expect(
      fileExists(join(tmpProjPath(), `${workerlib}/project.json`))
    ).toBeTruthy();
  }, 30_000);
});
