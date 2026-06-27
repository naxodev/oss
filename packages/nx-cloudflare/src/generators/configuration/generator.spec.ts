import { describe, it, expect, beforeEach } from 'bun:test';
import {
  addProjectConfiguration,
  readJson,
  readNxJson,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { parse } from 'jsonc-parser';
import { configurationGenerator } from './generator';

const PROJECT = 'web';
const ROOT = 'apps/web';

function seedProject(tree: Tree): void {
  addProjectConfiguration(tree, PROJECT, {
    root: ROOT,
    projectType: 'application',
    sourceRoot: `${ROOT}/src`,
    targets: {},
  });
}

function readConfig(tree: Tree): Record<string, unknown> {
  const text = tree.read(`${ROOT}/wrangler.jsonc`, 'utf-8');
  expect(text).toBeTruthy();
  return parse(text as string) as Record<string, unknown>;
}

describe('configuration generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedProject(tree);
  });

  it('authors a worker wrangler.jsonc with the offset $schema', async () => {
    await configurationGenerator(tree, {
      project: PROJECT,
      compatibilityDate: '2026-01-01',
    });

    const config = readConfig(tree);
    expect(config['name']).toBe('web');
    expect(config['main']).toBe('src/index.ts');
    expect(config['compatibility_date']).toBe('2026-01-01');
    expect(config['$schema']).toBe(
      '../../node_modules/wrangler/config-schema.json'
    );
    expect(config['assets']).toBeUndefined();
  });

  it('registers the inference plugin and installs the runtime deps', async () => {
    await configurationGenerator(tree, { project: PROJECT });

    const nxJson = readNxJson(tree);
    const ids = (nxJson?.plugins ?? []).map((p) =>
      typeof p === 'string' ? p : p.plugin
    );
    expect(ids).toContain('@naxodev/nx-cloudflare/plugin');

    const pkg = readJson(tree, 'package.json');
    expect(pkg.devDependencies['wrangler']).toBeTruthy();
    expect(pkg.devDependencies['@cloudflare/workers-types']).toBeTruthy();
  });

  it('gitignores the typegen output', async () => {
    await configurationGenerator(tree, { project: PROJECT });
    const gitignore = tree.read(`${ROOT}/.gitignore`, 'utf-8');
    expect(gitignore).toContain('worker-configuration.d.ts');
  });

  it('adds compatibility_flags when nodejsCompat is set', async () => {
    await configurationGenerator(tree, {
      project: PROJECT,
      nodejsCompat: true,
    });
    const config = readConfig(tree);
    expect(config['compatibility_flags']).toEqual(['nodejs_compat']);
  });

  it('throws when the project already has a wrangler config', async () => {
    tree.write(`${ROOT}/wrangler.jsonc`, '{}');
    await expect(
      configurationGenerator(tree, { project: PROJECT })
    ).rejects.toThrow(/already has a Cloudflare config/);
  });

  it('throws a helpful error for an unknown project', async () => {
    await expect(
      configurationGenerator(tree, { project: 'nope' })
    ).rejects.toThrow(/not found/);
  });

  it('authors an spa wrangler.jsonc with assets and no main', async () => {
    await configurationGenerator(tree, {
      project: PROJECT,
      template: 'spa',
      assetsDir: 'dist/web',
    });
    const config = readConfig(tree);
    expect(config['main']).toBeUndefined();
    expect(config['assets']).toEqual({
      directory: 'dist/web',
      not_found_handling: 'single-page-application',
    });
  });

  it('authors a fullstack wrangler.jsonc with assets binding and main', async () => {
    await configurationGenerator(tree, {
      project: PROJECT,
      template: 'fullstack',
      assetsDir: 'dist/web/client',
      main: 'src/worker.ts',
    });
    const config = readConfig(tree);
    expect(config['main']).toBe('src/worker.ts');
    expect(config['assets']).toEqual({
      directory: 'dist/web/client',
      binding: 'ASSETS',
    });
  });
});
