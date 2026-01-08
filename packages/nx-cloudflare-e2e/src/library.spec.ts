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
