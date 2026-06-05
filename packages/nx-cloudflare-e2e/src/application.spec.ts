import { uniq, fileExists, tmpProjPath } from '@nx/plugin/testing';
import {
  createTestProject,
  cleanup,
  runCLI,
  showProject,
  runCommandUntil,
  promisifiedTreeKill,
} from '@naxodev/e2e-utils';
import { join } from 'path';

describe('Cloudflare Worker Applications', () => {
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

  it('should be able to generate an empty application', () => {
    const workerapp = uniq('workerapp');

    runCLI(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="none"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    expect(
      fileExists(join(tmpProjPath(), `apps/${workerapp}/project.json`))
    ).toBeTruthy();
  }, 120_000);

  it('should resolve the serve and deploy executors from the installed package', () => {
    const workerapp = uniq('workerapp');

    runCLI(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="fetch-handler"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset the Nx daemon so the freshly generated project is in the graph.
    runCLI('reset');

    const project = showProject(workerapp);

    expect(project.targets?.serve?.executor).toBe(
      '@naxodev/nx-cloudflare:serve'
    );
    expect(project.targets?.deploy?.executor).toBe(
      '@naxodev/nx-cloudflare:deploy'
    );
  }, 120_000);

  it('should be able to generate and serve a fetch-handler application', async () => {
    const workerapp = uniq('workerapp');

    runCLI(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="fetch-handler"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset the Nx daemon so the freshly generated project is in the graph.
    runCLI('reset');

    const lintResults = runCLI(`lint ${workerapp}`);
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

  it('should be able to generate and serve a scheduled-handler application', async () => {
    const workerapp = uniq('workerapp');

    runCLI(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="scheduled-handler"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset the Nx daemon so the freshly generated project is in the graph.
    runCLI('reset');

    const lintResults = runCLI(`lint ${workerapp}`);
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

  it('should be able to generate and serve a hono application', async () => {
    const workerapp = uniq('workerapp');

    runCLI(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${workerapp}" --name=${workerapp} --template="hono"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset the Nx daemon so the freshly generated project is in the graph.
    runCLI('reset');

    const lintResults = runCLI(`lint ${workerapp}`);
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

  it('should be able to generate an application without specifying a directory', () => {
    const workerapp = uniq('workerapp');

    runCLI(
      `generate @naxodev/nx-cloudflare:app ${workerapp} --template="fetch-handler"`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Default directory should be the app name
    expect(
      fileExists(join(tmpProjPath(), `${workerapp}/src/index.ts`))
    ).toBeTruthy();

    // Reset the Nx daemon so the freshly generated project is in the graph.
    runCLI('reset');

    // The default-directory project must still resolve the installed package's
    // executors (not just scaffold files).
    const project = showProject(workerapp);
    expect(project.root).toBe(workerapp);
    expect(project.targets?.serve?.executor).toBe(
      '@naxodev/nx-cloudflare:serve'
    );
  }, 120_000);
});
