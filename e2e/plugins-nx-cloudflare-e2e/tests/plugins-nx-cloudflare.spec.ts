import { uniq, fileExists, tmpProjPath } from '@nx/plugin/testing';
import {
  newNxProject,
  installPlugin,
  cleanup,
  runNxCommandWithNpx,
  runCommandUntil,
  promisifiedTreeKill,
  killPorts,
} from '@naxodev/e2e/utils';
import * as http from 'http';
import { join } from 'path';

function getData(port: number, path = '/api'): Promise<any> {
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      expect(res.statusCode).toEqual(200);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.once('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
  });
}

describe('Cloudflare Worker Applications', () => {
  beforeEach(() => {
    newNxProject();
    installPlugin('nx-cloudflare');
  });

  afterEach(() => cleanup());

  // it('should be able to generate an empty application', async () => {
  //   const workerapp = uniq('workerapp');
  //
  //   runNxCommandWithNpx(
  //     `generate @naxodev/nx-cloudflare:app ${workerapp} --template="none"`
  //   );
  //
  //   expect(
  //     fileExists(join(tmpProjPath(), `apps/${workerapp}/project.json`))
  //   ).toBeTruthy();
  // }, 30_000);

  it('should be able to generate an fetch-handler application', async () => {
    const workerapp = uniq('workerapp');
    const originalEnvPort = process.env.PORT;
    const port = 3456;
    process.env.PORT = `${port}`;

    runNxCommandWithNpx(
      `generate @naxodev/nx-cloudflare:app ${workerapp} --template="fetch-handler"`
    );

    const lintResults = runNxCommandWithNpx(`lint ${workerapp}`);
    expect(lintResults).toContain('All files pass linting.');

    expect(fileExists('apps/workerapp/src/index.ts')).toBeTruthy();

    const testResults = runNxCommandWithNpx(`test ${workerapp}`);
    expect(testResults).toContain(
      `Successfully ran target test for project ${workerapp}`
    );

    const p = await runCommandUntil(`serve ${workerapp}`, (output) =>
      output.includes(`Listening at http://localhost:${port}`)
    );
    const result = await getData(port);
    expect(result.message).toMatch(`Welcome to ${workerapp}!`);

    try {
      await promisifiedTreeKill(p.pid!, 'SIGKILL');
      await killPorts(port);
    } finally {
      process.env.port = originalEnvPort;
    }
  }, 120_000);
});
