import {
  uniq,
  tmpProjPath,
  runNxCommand,
  ensureNxProject,
  cleanup,
  readJson,
  updateFile,
} from '@nx/plugin/testing';
import { join } from 'path';

describe('Next on Pages', () => {
  beforeEach(() => {
    ensureNxProject(
      '@naxodev/nx-cloudflare',
      'dist/packages/plugins/nx-cloudflare'
    );
  });

  afterEach(() => cleanup());

  it('should build a NextJS application with the next-on-pages script', async () => {
    const workerapp = uniq('workerapp');
    const port = 8787;

    runNxCommand(
      `generate @nx/next:app --name ${workerapp} --directory="apps" --appDir`
    );

    const projectJson = readJson(
      join(tmpProjPath(), `apps/${workerapp}/project.json`)
    );
    projectJson.targets.build.executor = '@naxodev/nx-cloudflare:next-build';
    updateFile(
      join(tmpProjPath(), `apps/${workerapp}/project.json`),
      JSON.stringify(projectJson)
    );

    const buildResults = runNxCommand(`build ${workerapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${workerapp}`
    );
  }, 120_000);
});
