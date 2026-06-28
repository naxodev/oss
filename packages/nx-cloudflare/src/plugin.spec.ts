import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger, type CreateNodesContext } from '@nx/devkit';
import { createNodes, type CloudflarePluginOptions } from './plugin';

const [configGlob, createNodesFn] = createNodes;

/** Build a workspace temp dir; caller writes fixtures into it. */
function setupWorkspace(): string {
  return mkdtempSync(join(tmpdir(), 'nx-cf-'));
}

function writeFile(
  workspaceRoot: string,
  relPath: string,
  content: string
): void {
  const abs = join(workspaceRoot, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

function ctx(workspaceRoot: string): CreateNodesContext {
  return {
    workspaceRoot,
    nxJsonConfiguration: {},
  } as unknown as CreateNodesContext;
}

/** Run the plugin for one config file and return the per-file result object. */
async function run(
  workspaceRoot: string,
  configFile: string,
  options: CloudflarePluginOptions = {}
) {
  const results = await createNodesFn(
    [configFile],
    options,
    ctx(workspaceRoot)
  );
  return results[0][1];
}

describe('nx-cloudflare createNodes', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = setupWorkspace();
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('infers the Worker lifecycle and secret targets for a valid jsonc config', async () => {
    // The exported glob is the contract Nx uses to discover configs.
    expect(configGlob).toBe('**/wrangler.{toml,jsonc,json}');

    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(
      workspaceRoot,
      'apps/worker/wrangler.jsonc',
      '{\n  // a worker\n  "name": "worker",\n  "main": "src/index.ts"\n}'
    );

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const targets = result.projects['apps/worker'].targets;

    expect(Object.keys(targets).sort()).toEqual(
      [
        'deploy',
        'serve',
        'tail',
        'typegen',
        'version-upload',
        'version-deploy',
        'secret',
      ].sort()
    );

    // Why: serve is the local dev server, must stay alive across the run, and
    // signals readiness via wrangler's "Ready on ..." line so dependent tasks
    // wait for the port to actually be listening.
    expect(targets.serve).toMatchObject({
      command: 'wrangler dev',
      options: { cwd: 'apps/worker', readyWhen: 'Ready on' },
      continuous: true,
    });
    // Why: tail streams logs indefinitely, so it is also continuous.
    expect(targets.tail).toMatchObject({
      command: 'wrangler tail',
      options: { cwd: 'apps/worker' },
      continuous: true,
    });
    // Why: deploy and version-upload have remote side effects -> never cached.
    expect(targets.deploy).toMatchObject({ command: 'wrangler deploy' });
    expect(targets.deploy.cache).toBeUndefined();
    expect(targets['version-upload']).toMatchObject({
      command: 'wrangler versions upload',
    });
    expect(targets['version-upload'].cache).toBeUndefined();
    // Why: version-deploy promotes an uploaded version to live traffic
    // (gradual rollout) -> remote side effect, never cached.
    expect(targets['version-deploy']).toMatchObject({
      command: 'wrangler versions deploy',
    });
    expect(targets['version-deploy'].cache).toBeUndefined();
    // Why: typegen is deterministic -> cacheable, invalidated on wrangler bumps.
    expect(targets.typegen).toMatchObject({
      command: 'wrangler types',
      cache: true,
      inputs: ['default', '^default', { externalDependencies: ['wrangler'] }],
      outputs: ['{projectRoot}/worker-configuration.d.ts'],
    });
  });

  it('honors custom target names from plugin options', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker"}');

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc', {
      serveTargetName: 'dev',
      deployTargetName: 'publish',
      typegenTargetName: 'types',
      versionUploadTargetName: 'upload',
      versionDeployTargetName: 'promote',
      tailTargetName: 'logs',
    });
    const targets = result.projects['apps/worker'].targets;

    expect(Object.keys(targets).sort()).toEqual(
      ['dev', 'logs', 'promote', 'publish', 'types', 'upload', 'secret'].sort()
    );
    expect(targets.dev).toMatchObject({
      command: 'wrangler dev',
      continuous: true,
    });
  });

  it('returns no targets when no project.json/package.json sits beside the config', async () => {
    // Config present, but the directory has no Nx project marker.
    writeFile(workspaceRoot, 'apps/loose/wrangler.jsonc', '{"name":"loose"}');

    const result = await run(workspaceRoot, 'apps/loose/wrangler.jsonc');

    expect(result).toEqual({});
  });

  it('accepts a package.json as the project marker', async () => {
    writeFile(workspaceRoot, 'apps/pkg/package.json', '{"name":"pkg"}');
    writeFile(workspaceRoot, 'apps/pkg/wrangler.jsonc', '{"name":"pkg"}');

    const result = await run(workspaceRoot, 'apps/pkg/wrangler.jsonc');

    expect(result.projects['apps/pkg'].targets.deploy).toMatchObject({
      command: 'wrangler deploy',
    });
  });

  it('skips an unparseable jsonc config and warns', async () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);
    writeFile(workspaceRoot, 'apps/bad/project.json', '{"name":"bad"}');
    writeFile(workspaceRoot, 'apps/bad/wrangler.jsonc', '{ not valid json ');

    const result = await run(workspaceRoot, 'apps/bad/wrangler.jsonc');

    expect(result).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unparseable'));
    warn.mockRestore();
  });

  it('skips an empty toml config and warns', async () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);
    writeFile(workspaceRoot, 'apps/empty/project.json', '{"name":"empty"}');
    writeFile(workspaceRoot, 'apps/empty/wrangler.toml', '   \n  ');

    const result = await run(workspaceRoot, 'apps/empty/wrangler.toml');

    expect(result).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty'));
    warn.mockRestore();
  });

  it('accepts a non-empty toml config (no strict parse)', async () => {
    writeFile(workspaceRoot, 'apps/tomlworker/project.json', '{"name":"tw"}');
    writeFile(
      workspaceRoot,
      'apps/tomlworker/wrangler.toml',
      'name = "tw"\nmain = "src/index.ts"\n'
    );

    const result = await run(workspaceRoot, 'apps/tomlworker/wrangler.toml');

    expect(result.projects['apps/tomlworker'].targets.serve).toMatchObject({
      command: 'wrangler dev',
    });
  });

  it('skips a config whose project directory cannot be read and warns', async () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);
    // No directory is created for apps/ghost, so the project-marker readdir
    // throws ENOENT. Inference must degrade to {} for this one config rather
    // than aborting graph construction for the whole workspace.
    const result = await run(workspaceRoot, 'apps/ghost/wrangler.jsonc');

    expect(result).toEqual({});
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('project directory')
    );
    warn.mockRestore();
  });

  it('infers targets for a plain wrangler.json (non-jsonc) config', async () => {
    // The glob matches `.json` too; it takes the same parse path as `.jsonc`.
    writeFile(workspaceRoot, 'apps/jsonworker/project.json', '{"name":"jw"}');
    writeFile(workspaceRoot, 'apps/jsonworker/wrangler.json', '{"name":"jw"}');

    const result = await run(workspaceRoot, 'apps/jsonworker/wrangler.json');

    expect(result.projects['apps/jsonworker'].targets.deploy).toMatchObject({
      command: 'wrangler deploy',
    });
  });

  it('accepts a parseable but minimal ({}) jsonc config', async () => {
    // Why: the gate is structural, not semantic. An empty object parses, so
    // targets are inferred; Wrangler validates the real config at runtime.
    // (Contrast empty .toml, which is rejected — see the empty-toml test.)
    writeFile(workspaceRoot, 'apps/min/project.json', '{"name":"min"}');
    writeFile(workspaceRoot, 'apps/min/wrangler.jsonc', '{}');

    const result = await run(workspaceRoot, 'apps/min/wrangler.jsonc');

    expect(result.projects['apps/min'].targets.deploy).toMatchObject({
      command: 'wrangler deploy',
    });
  });

  it('reflects plugin options in target names, not just config content', async () => {
    // Why: same config content, different options must yield differently named
    // targets. Guards that options flow through to the inferred target set.
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker"}');

    const defaults = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const custom = await run(workspaceRoot, 'apps/worker/wrangler.jsonc', {
      serveTargetName: 'dev',
    });

    expect(Object.keys(defaults.projects['apps/worker'].targets)).toContain(
      'serve'
    );
    const customTargets = custom.projects['apps/worker'].targets;
    expect(Object.keys(customTargets)).toContain('dev');
    expect(Object.keys(customTargets)).not.toContain('serve');
  });

  it('emits a single secret target with one configuration per subcommand', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(
      workspaceRoot,
      'apps/worker/wrangler.jsonc',
      '{"name":"worker","main":"src/index.ts"}'
    );

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const targets = result.projects['apps/worker'].targets;

    expect(targets['secret']).toEqual({
      executor: '@naxodev/nx-cloudflare:secret',
      configurations: {
        put: { command: 'put' },
        bulk: { command: 'bulk' },
        list: { command: 'list' },
        delete: { command: 'delete' },
      },
    });
  });

  it('emits a single d1 target with the database map when there is one D1 binding', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(
      workspaceRoot,
      'apps/worker/wrangler.jsonc',
      '{"name":"worker","d1_databases":[{"binding":"DB","database_name":"my-db"}]}'
    );

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const targets = result.projects['apps/worker'].targets;

    expect(targets['d1']).toEqual({
      executor: '@naxodev/nx-cloudflare:d1',
      options: { databases: { DB: 'my-db' } },
      configurations: {
        apply: { command: 'apply' },
        create: { command: 'create' },
        list: { command: 'list' },
      },
    });
  });

  it('bakes every binding into the one d1 target when there are multiple D1 bindings', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(
      workspaceRoot,
      'apps/worker/wrangler.jsonc',
      '{"name":"worker","d1_databases":[' +
        '{"binding":"DB","database_name":"main"},' +
        '{"binding":"ANALYTICS","database_name":"events"}]}'
    );

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const targets = result.projects['apps/worker'].targets;

    expect(targets['d1'].options).toEqual({
      databases: { DB: 'main', ANALYTICS: 'events' },
    });
    expect(targets['d1-apply']).toBeUndefined();
    expect(targets['d1-apply-ANALYTICS']).toBeUndefined();
  });

  it('emits no d1 target when there is no D1 binding', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(
      workspaceRoot,
      'apps/worker/wrangler.jsonc',
      '{"name":"worker","main":"src/index.ts"}'
    );

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const targets = result.projects['apps/worker'].targets;

    expect(targets['d1']).toBeUndefined();
  });

  it('honors custom d1/secret target-name overrides', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(
      workspaceRoot,
      'apps/worker/wrangler.jsonc',
      '{"name":"worker","d1_databases":[{"binding":"DB","database_name":"my-db"}]}'
    );

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc', {
      d1TargetName: 'migrate',
      secretTargetName: 'env-secret',
    });
    const targets = result.projects['apps/worker'].targets;

    expect(targets['migrate'].executor).toBe('@naxodev/nx-cloudflare:d1');
    expect(targets['migrate'].options).toEqual({ databases: { DB: 'my-db' } });
    expect(targets['env-secret'].executor).toBe(
      '@naxodev/nx-cloudflare:secret'
    );
  });

  it('handles multiple configs in one invocation, isolating failures', async () => {
    // Why: the real entry point receives many files in one invocation. A bad
    // config must degrade to {} without taking down a valid sibling.
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);
    writeFile(workspaceRoot, 'apps/a/project.json', '{"name":"a"}');
    writeFile(workspaceRoot, 'apps/a/wrangler.jsonc', '{"name":"a"}');
    writeFile(workspaceRoot, 'apps/b/project.json', '{"name":"b"}');
    writeFile(workspaceRoot, 'apps/b/wrangler.jsonc', '{ invalid ');

    const results = await createNodesFn(
      ['apps/a/wrangler.jsonc', 'apps/b/wrangler.jsonc'],
      {},
      ctx(workspaceRoot)
    );
    const byFile = Object.fromEntries(results);

    expect(
      byFile['apps/a/wrangler.jsonc'].projects['apps/a'].targets.deploy
    ).toMatchObject({ command: 'wrangler deploy' });
    expect(byFile['apps/b/wrangler.jsonc']).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unparseable'));
    warn.mockRestore();
  });
});
