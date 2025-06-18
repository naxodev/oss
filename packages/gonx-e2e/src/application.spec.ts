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

describe('Go Applications (with go.work)', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support first with go.work support
    runNxCommand('generate @naxodev/gonx:init --addGoDotWork');
  });

  afterEach(() => cleanup());

  it('should be able to generate a Go application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();
  }, 30_000);

  it('should be able to generate an application with a specific directory', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" --name=${goapp}`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Verify the application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to run build, lint, test and tidy commands on a Go application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to run the serve command on a Go application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run serve and wait until the server starts
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`Hello ${goapp}`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);
});

describe('Go Applications (without go.work)', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support without go.work support (new default)
    runNxCommand('generate @naxodev/gonx:init');
  });

  afterEach(() => cleanup());

  it('should be able to generate a Go application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  }, 30_000);

  it('should be able to generate an application with a specific directory without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" --name=${goapp}`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Verify the application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  }, 30_000);

  it('should be able to run build, lint, test and tidy commands on a Go application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to run the serve command on a Go application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run serve and wait until the server starts
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`Hello ${goapp}`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);
});
