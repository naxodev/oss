import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
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

describe('Go server readiness', () => {
  beforeAll(() => {
    createTestProject('gonx');
    runCLI(
      'generate @naxodev/gonx:application apps/api --skipFormat --no-interactive'
    );
  }, 300_000);

  afterAll(() => cleanup());

  it('waits for a project-defined health check before running its consumer', async () => {
    const port = await getAvailablePort();
    const app = join(tmpProjPath(), 'apps/api');
    writeFileSync(
      join(app, 'main.go'),
      `package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "strconv"
    "time"
)

func main() {
    if err := os.WriteFile("server.pid", []byte(strconv.Itoa(os.Getpid())), 0600); err != nil {
        log.Fatal(err)
    }
    time.Sleep(1500 * time.Millisecond)
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "ready")
    })
    log.Fatal(http.ListenAndServe("127.0.0.1:${port}", nil))
}
`
    );
    rmSync(join(app, 'main_test.go'));
    writeFileSync(
      join(app, 'project.json'),
      JSON.stringify({
        targets: {
          serve: {
            readyWhen: {
              url: `http://127.0.0.1:${port}/health`,
              timeout: 30000,
            },
          },
        },
      })
    );

    const consumer = join(tmpProjPath(), 'checks/api');
    mkdirSync(consumer, { recursive: true });
    writeFileSync(
      join(consumer, 'project.json'),
      JSON.stringify({
        name: 'api-consumer',
        targets: {
          check: {
            command: 'node probe.cjs',
            options: { cwd: 'checks/api' },
            dependsOn: [
              { projects: 'apps/api', target: 'serve', waitFor: 'ready' },
            ],
          },
        },
      })
    );
    writeFileSync(
      join(consumer, 'probe.cjs'),
      `const assert = require('node:assert/strict');
const { writeFileSync } = require('node:fs');
(async () => {
  const response = await fetch('http://127.0.0.1:${port}/health', {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(await response.text(), 'ready');
  writeFileSync('completed.txt', 'health check passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
`
    );

    try {
      runCLI('run api-consumer:check --skip-nx-cache', {
        env: { NX_DAEMON: 'false' },
      });

      expect(readFileSync(join(consumer, 'completed.txt'), 'utf8')).toBe(
        'health check passed'
      );
      await waitUntilFreeOnHost(port, '127.0.0.1', 100, 5000);
    } finally {
      const pidFile = join(app, 'server.pid');
      if (existsSync(pidFile)) {
        const pid = Number(readFileSync(pidFile, 'utf8'));
        if (isProcessRunning(pid)) await promisifiedTreeKill(pid, 'SIGKILL');
      }
    }
  }, 120_000);
});
