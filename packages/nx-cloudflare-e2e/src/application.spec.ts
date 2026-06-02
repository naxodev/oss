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
    // Nx 22.7 defaults generated projects to ESLint flat config, whose config
    // imports `typescript-eslint`. The bare e2e workspace never installs it, so
    // force the eslintrc format used across this repo to keep `nx lint`
    // resolvable (mirrors the plugin's generator unit-test expectations).
    process.env.ESLINT_USE_FLAT_CONFIG = 'false';
    ensureNxProject('@naxodev/nx-cloudflare', 'dist/packages/nx-cloudflare');
  });

  afterEach(() => cleanup());

  it('should be able to generate an empty application', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="none"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/project.json`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to generate an fetch-handler application', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="fetch-handler"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset Nx daemon to pick up new project
    runNxCommand(`reset`);

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
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="scheduled-handler"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset Nx daemon to pick up new project
    runNxCommand(`reset`);

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
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="hono"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset Nx daemon to pick up new project
    runNxCommand(`reset`);

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

  it('should be able to generate an application without specifying a directory', async () => {
    const workerapp = uniq('workerapp');

    runNxCommand(
      `generate @naxodev/nx-cloudflare:app ${workerapp} --template="fetch-handler"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset Nx daemon to pick up new project
    runNxCommand(`reset`);

    const lintResults = runNxCommand(`lint ${workerapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${workerapp}`
    );

    // Default directory should be the app name
    expect(
      fileExists(join(tmpProjPath(), `${workerapp}/src/index.ts`))
    ).toBeTruthy();
  }, 120_000);
});
