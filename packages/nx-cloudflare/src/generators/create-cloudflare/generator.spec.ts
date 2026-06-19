import {
  describe,
  it,
  expect,
  beforeEach,
  mock,
  spyOn,
  type Mock,
} from 'bun:test';
import * as devkit from '@nx/devkit';
import { logger, readJson, readNxJson, updateNxJson, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

const PLUGIN = '@naxodev/nx-cloudflare/plugin';
const pluginName = (p: unknown) =>
  typeof p === 'string' ? p : (p as { plugin?: string }).plugin;
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCloudflareGenerator } from './generator';
import { runC3 } from '../../utils/run-c3';
import { nxVitestVersion } from '../../utils/versions';

// Simulate C3 by writing a minimal scaffold (including the install artifacts C3
// always produces) into the temp dir it is handed, so unit tests never spawn a
// real process or hit the network.
mock.module('../../utils/run-c3', () => ({
  runC3: mock((options: { directory: string }) => {
    mkdirSync(join(options.directory, 'src'), { recursive: true });
    mkdirSync(join(options.directory, 'node_modules/dep'), { recursive: true });
    writeFileSync(
      join(options.directory, 'src/index.ts'),
      'export default {};'
    );
    writeFileSync(
      join(options.directory, 'wrangler.jsonc'),
      [
        '// Wrangler config',
        '{',
        '  "$schema": "node_modules/wrangler/config-schema.json",',
        '  "name": "scaffold",',
        '  "main": "src/index.ts"',
        '}',
        '',
      ].join('\n')
    );
    writeFileSync(
      join(options.directory, 'package.json'),
      JSON.stringify({
        name: 'scaffold',
        scripts: {
          deploy: 'wrangler deploy',
          dev: 'wrangler dev',
          start: 'wrangler dev',
          'cf-typegen': 'wrangler types',
          test: 'vitest',
          build: 'vite build',
        },
        dependencies: { hono: '^4' },
      })
    );
    writeFileSync(
      join(options.directory, 'node_modules/dep/index.js'),
      'module.exports = 1;'
    );
    writeFileSync(
      join(options.directory, 'pnpm-lock.yaml'),
      'lockfileVersion: 9'
    );
    // Editor/agent config C3 emits that clashes with workspace-level config.
    mkdirSync(join(options.directory, '.vscode'), { recursive: true });
    writeFileSync(join(options.directory, '.vscode/settings.json'), '{}');
    writeFileSync(join(options.directory, '.prettierrc'), '{"useTabs":true}');
    writeFileSync(join(options.directory, '.editorconfig'), 'root = true');
    writeFileSync(join(options.directory, 'AGENTS.md'), '# Cloudflare');
    writeFileSync(
      join(options.directory, '.gitignore'),
      '.wrangler/\n.dev.vars*'
    );
    // C3's Worker templates scaffold a vitest setup the generator wires into Nx.
    writeFileSync(
      join(options.directory, 'vitest.config.mts'),
      'export default {};'
    );
  }),
}));

const runC3Mock = runC3 as unknown as Mock<typeof runC3>;

describe('create-cloudflare generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    runC3Mock.mockClear();
  });

  it('runs C3 and imports the scaffold into the project root', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/my-worker',
      type: 'hello-world',
    });

    expect(tree.exists('apps/my-worker/src/index.ts')).toBe(true);
    expect(tree.exists('apps/my-worker/wrangler.jsonc')).toBe(true);
    expect(tree.exists('apps/my-worker/package.json')).toBe(true);
  });

  it('forwards the selection, lang, and pinned default version to C3', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/api',
      framework: 'react',
      lang: 'ts',
    });

    expect(runC3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        framework: 'react',
        lang: 'ts',
        c3Version: '2.70.0',
      })
    );
  });

  it('honors a c3Version override', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/api',
      type: 'hello-world',
      c3Version: '2.40.0',
    });

    expect(runC3Mock).toHaveBeenCalledWith(
      expect.objectContaining({ c3Version: '2.40.0' })
    );
  });

  it('does not import C3 install artifacts into the workspace', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/my-worker',
      type: 'hello-world',
    });

    expect(tree.exists('apps/my-worker/node_modules/dep/index.js')).toBe(false);
    expect(tree.exists('apps/my-worker/pnpm-lock.yaml')).toBe(false);
  });

  it('prunes C3 editor/agent config that clashes with the workspace, keeping .gitignore', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/my-worker',
      type: 'hello-world',
    });

    expect(tree.exists('apps/my-worker/.prettierrc')).toBe(false);
    expect(tree.exists('apps/my-worker/.editorconfig')).toBe(false);
    expect(tree.exists('apps/my-worker/AGENTS.md')).toBe(false);
    expect(tree.exists('apps/my-worker/.vscode/settings.json')).toBe(false);
    // The worker-specific .gitignore (.wrangler/, .dev.vars) is kept.
    expect(tree.exists('apps/my-worker/.gitignore')).toBe(true);
  });

  it('strips package.json scripts that duplicate inferred targets, keeping the rest', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/my-worker',
      type: 'hello-world',
    });

    const scripts = readJson(tree, 'apps/my-worker/package.json').scripts ?? {};
    // wrangler deploy/dev/types come from the createNodes plugin
    expect(scripts.deploy).toBeUndefined();
    expect(scripts.dev).toBeUndefined();
    expect(scripts.start).toBeUndefined();
    expect(scripts['cf-typegen']).toBeUndefined();
    // `test` (vitest) is now inferred by @nx/vitest → dropped too
    expect(scripts.test).toBeUndefined();
    // no inferred equivalent → kept
    expect(scripts.build).toBe('vite build');
  });

  it('sets the project package.json name to the Nx project name', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/my-worker',
      type: 'hello-world',
    });

    expect(readJson(tree, 'apps/my-worker/package.json').name).toBe(
      'my-worker'
    );
  });

  it('writes a metadata-only project.json when useProjectJson is set (targets are inferred)', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
      useProjectJson: true,
    });

    const projectJson = readJson(tree, 'apps/w/project.json');
    expect(projectJson.name).toBe('w');
    expect(projectJson.projectType).toBe('application');
    expect(projectJson.targets ?? {}).toEqual({});
  });

  it('writes no project.json when useProjectJson is false (pure inference)', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
      useProjectJson: false,
    });

    expect(tree.exists('apps/w/project.json')).toBe(false);
  });

  it('writes no project.json by default', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    expect(tree.exists('apps/w/project.json')).toBe(false);
  });

  it('returns a task that installs packages at the workspace root', async () => {
    const installSpy = spyOn(devkit, 'installPackagesTask').mockImplementation(
      () => undefined
    );

    const task = await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    expect(typeof task).toBe('function');
    task();
    expect(installSpy).toHaveBeenCalled();
    installSpy.mockRestore();
  });

  it('puts tags on package.json nx property in inference mode', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
      useProjectJson: false,
      tags: 'scope:edge, type:api',
    });

    expect(readJson(tree, 'apps/w/package.json').nx?.tags).toEqual([
      'scope:edge',
      'type:api',
    ]);
  });

  it('registers the createNodes inference plugin in nx.json', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    const plugins = readNxJson(tree)?.plugins ?? [];
    expect(plugins.map(pluginName)).toContain(PLUGIN);
  });

  it('does not duplicate the inference plugin when already registered', async () => {
    const nxJson = readNxJson(tree) ?? {};
    nxJson.plugins = [PLUGIN];
    updateNxJson(tree, nxJson);

    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    const count = (readNxJson(tree)?.plugins ?? [])
      .map(pluginName)
      .filter((p) => p === PLUGIN).length;
    expect(count).toBe(1);
  });

  it('registers the @nx/vitest plugin so the scaffold gets an inferred test target', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    const plugins = readNxJson(tree)?.plugins ?? [];
    expect(plugins.map(pluginName)).toContain('@nx/vitest');
  });

  it('adds @nx/vitest as a devDependency so the inferred test target can resolve it', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    expect(readJson(tree, 'package.json').devDependencies?.['@nx/vitest']).toBe(
      nxVitestVersion
    );
  });

  it('does not wire @nx/vitest when the scaffold ships no vitest config', async () => {
    runC3Mock.mockImplementationOnce((options) => {
      mkdirSync(join(options.directory, 'src'), { recursive: true });
      writeFileSync(
        join(options.directory, 'src/index.ts'),
        'export default {};'
      );
      writeFileSync(
        join(options.directory, 'wrangler.jsonc'),
        '{"name":"scaffold","main":"src/index.ts"}'
      );
      writeFileSync(
        join(options.directory, 'package.json'),
        '{"name":"scaffold","scripts":{"test":"vitest"}}'
      );
      // deliberately no vitest.config.*
    });

    await createCloudflareGenerator(tree, {
      directory: 'apps/no-tests',
      type: 'hello-world',
    });

    const plugins = readNxJson(tree)?.plugins ?? [];
    expect(plugins.map(pluginName)).not.toContain('@nx/vitest');
    expect(
      readJson(tree, 'package.json').devDependencies?.['@nx/vitest']
    ).toBeUndefined();
    // No inferred test target here, so the `test` script is left in place.
    expect(readJson(tree, 'apps/no-tests/package.json').scripts?.test).toBe(
      'vitest'
    );
  });

  it('drops vitest scripts by command value, including arg forms and non-`test` names', async () => {
    runC3Mock.mockImplementationOnce((options) => {
      mkdirSync(join(options.directory, 'src'), { recursive: true });
      writeFileSync(
        join(options.directory, 'src/index.ts'),
        'export default {};'
      );
      writeFileSync(
        join(options.directory, 'wrangler.jsonc'),
        '{"name":"scaffold","main":"src/index.ts"}'
      );
      writeFileSync(
        join(options.directory, 'vitest.config.mts'),
        'export default {};'
      );
      writeFileSync(
        join(options.directory, 'package.json'),
        JSON.stringify({
          name: 'scaffold',
          scripts: { test: 'vitest run', 'test:unit': 'vitest --coverage' },
        })
      );
    });

    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    const scripts = readJson(tree, 'apps/w/package.json').scripts ?? {};
    expect(scripts.test).toBeUndefined();
    expect(scripts['test:unit']).toBeUndefined();
  });

  it('keeps non-vitest scripts when wiring the test target', async () => {
    runC3Mock.mockImplementationOnce((options) => {
      mkdirSync(join(options.directory, 'src'), { recursive: true });
      writeFileSync(
        join(options.directory, 'src/index.ts'),
        'export default {};'
      );
      writeFileSync(
        join(options.directory, 'wrangler.jsonc'),
        '{"name":"scaffold","main":"src/index.ts"}'
      );
      writeFileSync(
        join(options.directory, 'vitest.config.mts'),
        'export default {};'
      );
      writeFileSync(
        join(options.directory, 'package.json'),
        JSON.stringify({
          name: 'scaffold',
          // `test: jest` is not vitest; `vitest-ui` is a different binary.
          scripts: { test: 'jest', ui: 'vitest-ui --open' },
        })
      );
    });

    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    const scripts = readJson(tree, 'apps/w/package.json').scripts ?? {};
    expect(scripts.test).toBe('jest');
    expect(scripts.ui).toBe('vitest-ui --open');
  });

  it('does not duplicate @nx/vitest when already registered', async () => {
    const nxJson = readNxJson(tree) ?? {};
    nxJson.plugins = ['@nx/vitest'];
    updateNxJson(tree, nxJson);

    await createCloudflareGenerator(tree, {
      directory: 'apps/w',
      type: 'hello-world',
    });

    const count = (readNxJson(tree)?.plugins ?? [])
      .map(pluginName)
      .filter((p) => p === '@nx/vitest').length;
    expect(count).toBe(1);
  });

  it('rewrites the wrangler $schema to a workspace-root-relative path, preserving comments', async () => {
    await createCloudflareGenerator(tree, {
      directory: 'apps/my-worker',
      type: 'hello-world',
    });

    const config = tree.read('apps/my-worker/wrangler.jsonc', 'utf-8');
    expect(config).toContain(
      '"$schema": "../../node_modules/wrangler/config-schema.json"'
    );
    expect(config).toContain('// Wrangler config');
  });

  it('warns loudly when the scaffold has no wrangler config at the project root', async () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);
    runC3Mock.mockImplementationOnce((options) => {
      mkdirSync(join(options.directory, 'src'), { recursive: true });
      writeFileSync(
        join(options.directory, 'src/index.ts'),
        'export default {};'
      );
      writeFileSync(
        join(options.directory, 'package.json'),
        '{"name":"scaffold"}'
      );
      // deliberately no wrangler.{toml,jsonc,json}
    });

    await createCloudflareGenerator(tree, {
      directory: 'apps/pages-thing',
      template: 'some/pages-only',
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/no inferred Nx targets/i)
    );
    warn.mockRestore();
  });

  it('does not warn when a wrangler config is present', async () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);

    await createCloudflareGenerator(tree, {
      directory: 'apps/my-worker',
      type: 'hello-world',
    });

    expect(warn).not.toHaveBeenCalledWith(
      expect.stringMatching(/no inferred Nx targets/i)
    );
    warn.mockRestore();
  });
});
