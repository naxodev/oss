import {
  uniq,
  runNxCommand,
  ensureNxProject,
  cleanup,
  readJson,
  updateFile,
} from '@nx/plugin/testing';

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

    runNxCommand(
      `generate @nx/next:app --name ${workerapp} --directory="apps" --appDir`
    );

    const projectJson = readJson(`apps/${workerapp}/project.json`);
    projectJson.targets.build.executor = '@naxodev/nx-cloudflare:next-build';
    console.log('file to update', projectJson);
    updateFile(`apps/${workerapp}/project.json`, JSON.stringify(projectJson));

    console.log('updated file', readJson(`apps/${workerapp}/project.json`));

    const buildResults = runNxCommand(`build ${workerapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${workerapp}`
    );
  }, 120_000);
});
