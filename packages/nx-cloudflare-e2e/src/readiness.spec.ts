import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { dirname, join } from 'node:path';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { waitUntilFreeOnHost } from 'tcp-port-used';
import { tmpProjPath } from '@nx/plugin/testing';
import {
  cleanup,
  createTestProject,
  getAvailablePort,
  isProcessRunning,
  promisifiedTreeKill,
  runCLI,
} from '@naxodev/e2e-utils';

function writeFixture(path: string, content: string): void {
  const absolutePath = join(tmpProjPath(), path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

describe('inferred Worker readiness', () => {
  beforeAll(() => {
    createTestProject('nx-cloudflare');
    const nx = JSON.parse(readFileSync(join(tmpProjPath(), 'nx.json'), 'utf8'));
    nx.plugins ??= [];
    nx.plugins.push({
      plugin: '@naxodev/nx-cloudflare/plugin',
      options: { serveTargetName: 'dev' },
    });
    writeFixture('nx.json', JSON.stringify(nx));

    // Keep the inferred command unchanged. Delay the real CLI to expose races.
    const bin = join(tmpProjPath(), 'node_modules/.bin/wrangler');
    const wrangler = realpathSync(bin);
    rmSync(bin);
    writeFileSync(
      bin,
      `#!/usr/bin/env node
const { spawn } = require('node:child_process');
require('node:fs').writeFileSync('server.pid', String(process.pid));
if (process.env.READINESS_FIXTURE_MODE === 'exit') {
  console.error('fixture startup failed');
  process.exit(17);
}
if (process.env.READINESS_FIXTURE_MODE === 'timeout') {
  console.log('fixture never becomes ready');
  setInterval(() => {}, 1000);
} else {
setTimeout(() => {
  const child = spawn(process.execPath, [${JSON.stringify(
    wrangler
  )}, ...process.argv.slice(2)], { stdio: 'inherit' });
  child.on('error', (error) => { console.error(error); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}, 1500);
}
`
    );
    chmodSync(bin, 0o755);
  }, 300_000);

  afterAll(() => cleanup());

  it('waits for Wrangler and keeps it alive until the dependent task finishes', async () => {
    const port = await getAvailablePort();
    writeFixture(
      'apps/worker/wrangler.jsonc',
      JSON.stringify({
        name: 'readiness-worker',
        main: 'src/index.js',
        compatibility_date: '2026-11-01',
        dev: { ip: '127.0.0.1', port },
      })
    );
    writeFixture(
      'apps/worker/src/index.js',
      "export default { fetch() { return new Response('worker-ready'); } };"
    );
    writeFixture(
      'apps/worker/project.json',
      JSON.stringify({
        name: 'readiness-worker',
      })
    );
    writeFixture(
      'apps/consumer/project.json',
      JSON.stringify({
        name: 'readiness-consumer',
        targets: {
          check: {
            command: 'node probe.cjs',
            options: { cwd: 'apps/consumer' },
            dependsOn: [
              { projects: 'readiness-worker', target: 'dev', waitFor: 'ready' },
            ],
          },
        },
      })
    );
    writeFixture(
      'apps/consumer/probe.cjs',
      `const assert = require('node:assert/strict');
const { writeFileSync } = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');
(async () => {
  for (let request = 0; request < 2; request++) {
    const response = await fetch('http://127.0.0.1:${port}', {
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(await response.text(), 'worker-ready');
    await delay(250);
  }
  writeFileSync('completed.txt', 'both requests succeeded');
})().catch((error) => { console.error(error); process.exitCode = 1; });`
    );

    try {
      runCLI('run readiness-consumer:check --skip-nx-cache', {
        env: { NX_DAEMON: 'false', WRANGLER_SEND_METRICS: 'false' },
      });

      expect(
        readFileSync(join(tmpProjPath(), 'apps/consumer/completed.txt'), 'utf8')
      ).toBe('both requests succeeded');
      await waitUntilFreeOnHost(port, '127.0.0.1', 100, 5000);
    } finally {
      const pidFile = join(tmpProjPath(), 'apps/worker/server.pid');
      if (existsSync(pidFile)) {
        const pid = Number(readFileSync(pidFile, 'utf8'));
        if (isProcessRunning(pid)) await promisifiedTreeKill(pid, 'SIGKILL');
      }
    }
  }, 120_000);

  it.each([
    { mode: 'exit', failure: 'fixture startup failed' },
    { mode: 'timeout', failure: 'did not become ready' },
  ])(
    'blocks dependent tasks when startup ends in $mode',
    async ({ mode, failure }) => {
      const worker = `worker-${mode}`;
      const consumer = `consumer-${mode}`;
      writeFixture(`apps/${worker}/wrangler.jsonc`, '{}');
      writeFixture(
        `apps/${worker}/project.json`,
        JSON.stringify({
          name: worker,
          targets: { dev: { readyWhen: { '...': true, timeout: 5000 } } },
        })
      );
      writeFixture(
        `apps/${consumer}/project.json`,
        JSON.stringify({
          name: consumer,
          targets: {
            check: {
              command: 'node probe.cjs',
              options: { cwd: `apps/${consumer}` },
              dependsOn: [
                { projects: worker, target: 'dev', waitFor: 'ready' },
              ],
            },
          },
        })
      );
      writeFixture(
        `apps/${consumer}/probe.cjs`,
        "require('node:fs').writeFileSync('started.txt', 'started');"
      );

      const output = runCLI(`run ${consumer}:check --skip-nx-cache`, {
        silenceError: true,
        env: { NX_DAEMON: 'false', READINESS_FIXTURE_MODE: mode },
      });

      const pid = Number(
        readFileSync(join(tmpProjPath(), `apps/${worker}/server.pid`), 'utf8')
      );
      try {
        expect(output).toContain(failure);
        expect(output).toContain('failed');
        expect(
          existsSync(join(tmpProjPath(), `apps/${consumer}/started.txt`))
        ).toBe(false);
        for (
          let attempt = 0;
          attempt < 50 && isProcessRunning(pid);
          attempt++
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        expect(isProcessRunning(pid)).toBe(false);
      } finally {
        if (isProcessRunning(pid)) await promisifiedTreeKill(pid, 'SIGKILL');
      }
    },
    60_000
  );
});
