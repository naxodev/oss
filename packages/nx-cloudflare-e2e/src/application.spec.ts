import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { uniq, fileExists, tmpProjPath } from '@nx/plugin/testing';
import { createTestProject, cleanup, runCLI } from '@naxodev/e2e-utils';
import { readFileSync } from 'fs';
import { join } from 'path';

// `application` (alias `app`) delegates to create-cloudflare. This is a thin
// smoke test that the alias scaffolds end-to-end via real C3; the full behavior
// (inferred targets, artifact stripping, etc.) is covered by
// create-cloudflare.spec.ts.
describe('Cloudflare Worker Applications', () => {
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

  it('scaffolds a Worker through the app alias via C3', () => {
    const app = uniq('workerapp');

    runCLI(
      `generate @naxodev/nx-cloudflare:app --directory="apps/${app}" --type=hello-world --lang=ts --no-interactive`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    const root = join(tmpProjPath(), `apps/${app}`);
    expect(fileExists(join(root, 'wrangler.jsonc'))).toBeTruthy();
    expect(fileExists(join(root, 'src/index.ts'))).toBeTruthy();

    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe(app);
  }, 300_000);
});
