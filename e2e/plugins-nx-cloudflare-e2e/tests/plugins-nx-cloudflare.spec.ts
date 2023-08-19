import {
  uniq,
  fileExists,
  tmpProjPath,
  runNxCommand,
} from '@nx/plugin/testing';
import {
  newNxProject,
  installPlugin,
  cleanup,
  promisifiedTreeKill,
  runCommandUntil,
  killPorts,
} from '@naxodev/e2e/utils';
import { join } from 'path';

describe('Cloudflare Worker Applications', () => {
  beforeEach(() => {
    newNxProject();
    installPlugin('nx-cloudflare');
  });

  afterEach(() => cleanup());

  it('should be able to generate an empty application', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app ${workerapp} --template="none"`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/project.json`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to generate an fetch-handler application', async () => {
    const workerapp = uniq('workerapp');
    const port = 8787;

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app ${workerapp} --template="fetch-handler"`
    );

    const lintResults = runNxCommand(`lint ${workerapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${workerapp}`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/src/index.ts`))
    ).toBeTruthy();

    const p = await runCommandUntil(`serve ${workerapp}`, (output: string) =>
      output.includes(`wrangler dev now uses local mode by default`)
    );

    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
      await killPorts(port);
    }
  }, 120_000);

  it('should be able to generate an scheduled-handler application', async () => {
    const workerapp = uniq('workerapp');
    const port = 8787;

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app ${workerapp} --template="scheduled-handler"`
    );

    const lintResults = runNxCommand(`lint ${workerapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${workerapp}`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/src/index.ts`))
    ).toBeTruthy();

    const p = await runCommandUntil(`serve ${workerapp}`, (output: string) =>
      output.includes(`wrangler dev now uses local mode by default`)
    );

    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
      await killPorts(port);
    }
  }, 120_000);

  it('should be able to generate an hono application', async () => {
    const workerapp = uniq('workerapp');
    const port = 8787;

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app ${workerapp} --template="hono"`
    );

    const lintResults = runNxCommand(`lint ${workerapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${workerapp}`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/src/index.ts`))
    ).toBeTruthy();

    const p = await runCommandUntil(`serve ${workerapp}`, (output: string) =>
      output.includes(`wrangler dev now uses local mode by default`)
    );

    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
      await killPorts(port);
    }
  }, 120_000);
});
