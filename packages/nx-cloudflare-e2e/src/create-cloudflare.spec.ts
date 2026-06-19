import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { uniq, fileExists, tmpProjPath } from '@nx/plugin/testing';
import {
  createTestProject,
  cleanup,
  runCLI,
  showProject,
} from '@naxodev/e2e-utils';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Exercises the create-cloudflare generator end-to-end: it shells out to the
// real create-cloudflare (C3) CLI, then makes the scaffold Nx-ready. Heavier
// than the other suites because C3 downloads + installs a real Worker template.
describe('create-cloudflare generator (C3 wrapper)', () => {
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

  it('scaffolds a Worker via real C3 and makes it Nx-ready', () => {
    const app = uniq('c3worker');

    runCLI(
      `generate @naxodev/nx-cloudflare:create-cloudflare --directory="apps/${app}" --type=hello-world --lang=ts --no-interactive`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    const root = join(tmpProjPath(), `apps/${app}`);

    // The C3 scaffold was imported.
    expect(fileExists(join(root, 'wrangler.jsonc'))).toBeTruthy();
    expect(fileExists(join(root, 'src/index.ts'))).toBeTruthy();
    expect(fileExists(join(root, 'package.json'))).toBeTruthy();

    // C3's install artifacts were stripped (reconciled at the workspace root).
    expect(existsSync(join(root, 'node_modules'))).toBeFalsy();

    // C3's editor/agent config that clashes with the workspace is pruned; the
    // worker-specific .gitignore (.wrangler/, .dev.vars) is kept.
    expect(existsSync(join(root, '.prettierrc'))).toBeFalsy();
    expect(existsSync(join(root, '.editorconfig'))).toBeFalsy();
    expect(existsSync(join(root, '.vscode'))).toBeFalsy();
    expect(existsSync(join(root, 'AGENTS.md'))).toBeFalsy();
    expect(fileExists(join(root, '.gitignore'))).toBeTruthy();

    // The package identity was aligned with the Nx project.
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe(app);

    // Scripts duplicating inferred targets are dropped: the wrangler ones and
    // `test` (now inferred by @nx/vitest).
    const scripts = pkg.scripts ?? {};
    expect(scripts.deploy).toBeUndefined();
    expect(scripts.dev).toBeUndefined();
    expect(scripts['cf-typegen']).toBeUndefined();
    expect(scripts.test).toBeUndefined();

    // The Wrangler $schema was retargeted to the workspace root.
    const wrangler = readFileSync(join(root, 'wrangler.jsonc'), 'utf-8');
    expect(wrangler).toContain(
      '../../node_modules/wrangler/config-schema.json'
    );

    // No project.json by default: identity comes from package.json and the
    // worker is registered as a named project with inferred targets by the
    // createNodesV2 plugin.
    expect(existsSync(join(root, 'project.json'))).toBeFalsy();
    runCLI('reset');
    const project = showProject(app);
    expect(project.targets?.serve).toBeDefined();
    expect(project.targets?.deploy).toBeDefined();

    // @nx/vitest was registered, so C3's vitest.config.mts is inferred as a
    // `test` target. Assert it resolves to vitest rather than running it:
    // executing the suite needs the worker's own deps installed, which requires
    // a package-based workspace that isn't nested in this repo (bun otherwise
    // dedupes the worker's vitest against the repo's). The run itself is
    // verified standalone, outside the e2e harness.
    const testTarget = project.targets?.test as
      | { command?: string; metadata?: { technologies?: string[] } }
      | undefined;
    expect(testTarget).toBeDefined();
    expect(
      testTarget?.command?.includes('vitest') ||
        testTarget?.metadata?.technologies?.includes('vitest')
    ).toBe(true);
  }, 300_000);

  it('writes an explicit project.json when useProjectJson is set', () => {
    const app = uniq('c3pj');

    runCLI(
      `generate @naxodev/nx-cloudflare:create-cloudflare --directory="apps/${app}" --type=hello-world --lang=ts --useProjectJson=true --no-interactive`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    const root = join(tmpProjPath(), `apps/${app}`);
    expect(existsSync(join(root, 'project.json'))).toBeTruthy();

    runCLI('reset');
    const project = showProject(app);
    expect(project.targets?.serve).toBeDefined();
  }, 300_000);
});
