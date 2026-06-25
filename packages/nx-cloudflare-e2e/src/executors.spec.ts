import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { uniq, tmpProjPath } from '@nx/plugin/testing';
import { createTestProject, cleanup, runCLI } from '@naxodev/e2e-utils';
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

// Exercises the d1 and secret executors end-to-end against the published
// tarball. Two things the unit tests can't cover:
//   1. Inference resolves through the real `exports` map + `executors.json`, so
//      a consumer's project actually gets the executor-backed targets.
//   2. Running a target resolves the executor, builds the right `wrangler`
//      argv, and invokes the binary — the ExecutorContext + run-wrangler path.
//
// `wrangler` is stubbed on PATH (see the second test) so nothing reaches
// Cloudflare. The scaffolded Worker is inference-only (no project.json); the
// nx-cloudflare plugin is registered via NX_ADD_PLUGINS during create-cloudflare.
describe('d1 + secret executors', () => {
  let priorFlatConfig: string | undefined;
  const app = uniq('execworker');

  beforeAll(() => {
    priorFlatConfig = process.env.ESLINT_USE_FLAT_CONFIG;
    process.env.ESLINT_USE_FLAT_CONFIG = 'false';
    createTestProject('nx-cloudflare');

    runCLI(
      `generate @naxodev/nx-cloudflare:create-cloudflare --directory="apps/${app}" --type=hello-world --lang=ts --no-interactive`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );
    runCLI(
      `generate @naxodev/nx-cloudflare:binding --project="${app}" --type=d1 --binding=DB --databaseName=my-db --id=test-db-id --skipTypegen --no-interactive`
    );
  }, 600_000);

  afterAll(() => {
    if (priorFlatConfig === undefined) {
      delete process.env.ESLINT_USE_FLAT_CONFIG;
    } else {
      process.env.ESLINT_USE_FLAT_CONFIG = priorFlatConfig;
    }
    cleanup();
  });

  it('infers d1 and secret targets pointing at the executors', () => {
    const output = runCLI(`show project ${app} --json`);
    const project = JSON.parse(
      output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1)
    );
    const targets = project.targets;

    // One D1 binding -> bare d1-* names, with the database_name baked in.
    expect(targets['d1-apply'].executor).toBe('@naxodev/nx-cloudflare:d1');
    expect(targets['d1-apply'].options).toMatchObject({
      command: 'apply',
      database: 'my-db',
    });
    expect(targets['d1-create'].options).toMatchObject({
      command: 'create',
      database: 'my-db',
    });
    expect(targets['d1-list'].options).toMatchObject({
      command: 'list',
      database: 'my-db',
    });

    // Secret targets are emitted for every Worker (no config signal to gate on).
    const secretCommands = {
      'secret-put': 'put',
      'secret-bulk': 'bulk',
      'secret-list': 'list',
      'secret-delete': 'delete',
    } as const;
    for (const [name, command] of Object.entries(secretCommands)) {
      expect(targets[name].executor).toBe('@naxodev/nx-cloudflare:secret');
      expect(targets[name].options).toMatchObject({ command });
    }
  }, 120_000);

  it('runs the executors and invokes wrangler with the built argv', () => {
    // Stub `wrangler` so nothing reaches Cloudflare; the stub appends its argv
    // (one line per call) to a log the test reads back. The package manager
    // prepends the workspace's node_modules/.bin to PATH when nx runs a target,
    // so the real wrangler shadows anything we add to PATH — replace the
    // resolved binary directly instead. The throwaway workspace is discarded in
    // cleanup, so overwriting it is safe.
    const logFile = join(tmpProjPath(), 'wrangler-calls.log');
    const stub = `#!/bin/sh\necho "$@" >> "$WRANGLER_E2E_LOG"\n`;
    const binCandidates = [
      join(tmpProjPath(), 'node_modules', '.bin', 'wrangler'),
      join(tmpProjPath(), 'apps', app, 'node_modules', '.bin', 'wrangler'),
    ];
    let stubbed = 0;
    for (const bin of binCandidates) {
      if (existsSync(bin)) {
        rmSync(bin, { force: true });
        writeFileSync(bin, stub);
        chmodSync(bin, 0o755);
        stubbed++;
      }
    }
    expect(stubbed).toBeGreaterThan(0);

    const env = { WRANGLER_E2E_LOG: logFile };

    // `--remote` is a typed executor option, so nx threads it into the argv.
    runCLI(`d1-list ${app} --remote`, { env });
    runCLI(`secret-list ${app}`, { env });

    const calls = readFileSync(logFile, 'utf-8');
    expect(calls).toContain('d1 migrations list my-db --remote');
    expect(calls).toContain('secret list');
  }, 240_000);
});
