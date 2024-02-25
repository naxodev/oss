import {
  uniq,
  fileExists,
  tmpProjPath,
  runNxCommand,
  ensureNxProject,
  cleanup,
} from '@nx/plugin/testing';
import { promisifiedTreeKill, runCommandUntil } from '@naxodev/e2e-utils';
import { join } from 'path';

describe('Cloudflare Worker Applications', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/nx-cloudflare', 'dist/packages/nx-cloudflare');
  });

  afterEach(() => cleanup());

  it('should be able to generate an empty application', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app --name ${workerapp} --directory="apps" --template="none"`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/project.json`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to generate an fetch-handler application', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app --name ${workerapp} --directory="apps" --template="fetch-handler"`
    );

    const lintResults = runNxCommand(`lint ${workerapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${workerapp}`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/src/index.ts`))
    ).toBeTruthy();

    const p = await runCommandUntil(`serve ${workerapp}`, (output: string) =>
      output.includes(`Starting local server`)
    );

    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to generate an scheduled-handler application', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app --name ${workerapp} --directory="apps" --template="scheduled-handler"`
    );

    const lintResults = runNxCommand(`lint ${workerapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${workerapp}`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/src/index.ts`))
    ).toBeTruthy();

    const p = await runCommandUntil(`serve ${workerapp}`, (output: string) =>
      output.includes(`Starting local server`)
    );

    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to generate an hono application', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app --name ${workerapp} --directory="apps" --template="hono"`
    );

    const lintResults = runNxCommand(`lint ${workerapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${workerapp}`
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/src/index.ts`))
    ).toBeTruthy();

    const p = await runCommandUntil(`serve ${workerapp}`, (output: string) =>
      output.includes(`Starting local server`)
    );

    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);
});
