import {
  uniq,
  fileExists,
  tmpProjPath,
  runNxCommand,
} from '@nx/plugin/testing';
import { newNxProject, installPlugin, cleanup } from '@naxodev/e2e/utils';
import { join } from 'path';

describe('Cloudflare Worker Library', () => {
  beforeEach(() => {
    newNxProject();
    installPlugin('nx-cloudflare');
  });

  afterEach(() => cleanup());

  it('should be able to generate a library', async () => {
    const workerlib = uniq('workerlib');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:lib --name=${workerlib} --directory="libs/${workerlib}" --unitTestRunner="none"`
    );

    expect(
      fileExists(join(tmpProjPath(), `libs/${workerlib}/project.json`))
    ).toBeTruthy();
  }, 30_000);
});
