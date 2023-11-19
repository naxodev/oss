import {
  uniq,
  runNxCommand,
  ensureNxProject,
  cleanup,
  readJson,
  updateFile,
} from '@nx/plugin/testing';

const workerapp = uniq('workerapp');

describe('Next on Pages', () => {
  beforeEach(() => {
    ensureNxProject(
      '@naxodev/nx-cloudflare',
      'dist/packages/plugins/nx-cloudflare'
    );

    runNxCommand(
      `generate @nx/next:app --name ${workerapp} --directory="apps" --appDir`
    );
  });

  afterEach(() => cleanup());

  it('should build a NextJS application with the next-on-pages script', async () => {
    const projectJson = readJson(`apps/${workerapp}/project.json`);
    projectJson.targets.build.executor = '@naxodev/nx-cloudflare:next-build';
    updateFile(`apps/${workerapp}/project.json`, JSON.stringify(projectJson));

    const buildResults = runNxCommand(`build ${workerapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${workerapp}`
    );
  }, 120_000);
});
