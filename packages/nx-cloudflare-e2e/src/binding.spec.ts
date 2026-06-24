import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { uniq, fileExists, tmpProjPath } from '@nx/plugin/testing';
import { createTestProject, cleanup, runCLI } from '@naxodev/e2e-utils';
import { readFileSync } from 'fs';
import { join } from 'path';

// Exercises the binding generator end-to-end: scaffolds a Worker via real C3,
// then runs `:binding` against the published tarball to verify config edits,
// code stubs, and migrations land correctly in a real consumer workspace.
//
// The scaffolded Worker is inference-only (no project.json, and `apps/` is
// outside this preset's `workspaces: ["packages/*"]` globs), so the generator
// resolves it through the project graph rather than `getProjects` — see
// resolveProjectRoot in the generator.
describe('binding generator', () => {
  let priorFlatConfig: string | undefined;

  beforeAll(() => {
    priorFlatConfig = process.env.ESLINT_USE_FLAT_CONFIG;
    process.env.ESLINT_USE_FLAT_CONFIG = 'false';
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

  it('adds a KV binding to an existing Worker', () => {
    const app = uniq('bindingkv');

    runCLI(
      `generate @naxodev/nx-cloudflare:create-cloudflare --directory="apps/${app}" --type=hello-world --lang=ts --no-interactive`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    runCLI(
      `generate @naxodev/nx-cloudflare:binding --project="${app}" --type=kv --binding=MY_KV --id=test-id-123 --skipTypegen --no-interactive`
    );

    const root = join(tmpProjPath(), `apps/${app}`);
    const wrangler = readFileSync(join(root, 'wrangler.jsonc'), 'utf-8');
    expect(wrangler).toContain('kv_namespaces');
    expect(wrangler).toContain('MY_KV');
    expect(wrangler).toContain('test-id-123');
  }, 300_000);

  it('adds a Durable Object binding with a migration and class stub', () => {
    const app = uniq('bindingdo');

    runCLI(
      `generate @naxodev/nx-cloudflare:create-cloudflare --directory="apps/${app}" --type=hello-world --lang=ts --no-interactive`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    runCLI(
      `generate @naxodev/nx-cloudflare:binding --project="${app}" --type=do --binding=MY_DO --name=MyDurableObject --skipTypegen --no-interactive`
    );

    const root = join(tmpProjPath(), `apps/${app}`);
    const wrangler = readFileSync(join(root, 'wrangler.jsonc'), 'utf-8');
    expect(wrangler).toContain('durable_objects');
    expect(wrangler).toContain('MyDurableObject');
    expect(wrangler).toContain('migrations');
    expect(wrangler).toContain('"v1"');

    expect(fileExists(join(root, 'src/my-durable-object.ts'))).toBeTruthy();
    const stub = readFileSync(join(root, 'src/my-durable-object.ts'), 'utf-8');
    expect(stub).toContain('export class MyDurableObject');

    const index = readFileSync(join(root, 'src/index.ts'), 'utf-8');
    expect(index).toContain("export * from './my-durable-object'");
  }, 300_000);

  it('adds a Queue binding with producer + consumer and a queue handler', () => {
    const app = uniq('bindingqueue');

    runCLI(
      `generate @naxodev/nx-cloudflare:create-cloudflare --directory="apps/${app}" --type=hello-world --lang=ts --no-interactive`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    runCLI(
      `generate @naxodev/nx-cloudflare:binding --project="${app}" --type=queue --binding=MY_QUEUE --name=my-queue --skipTypegen --no-interactive`
    );

    const root = join(tmpProjPath(), `apps/${app}`);
    const wrangler = readFileSync(join(root, 'wrangler.jsonc'), 'utf-8');
    expect(wrangler).toContain('queues');
    expect(wrangler).toContain('producers');
    expect(wrangler).toContain('consumers');
    expect(wrangler).toContain('my-queue');

    const index = readFileSync(join(root, 'src/index.ts'), 'utf-8');
    expect(index).toContain('async queue(');
  }, 300_000);
});
