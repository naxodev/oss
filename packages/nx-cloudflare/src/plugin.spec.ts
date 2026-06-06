import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger, type CreateNodesContextV2 } from '@nx/devkit';
import { createNodesV2, type CloudflarePluginOptions } from './plugin';

const [configGlob, createNodesFn] = createNodesV2;

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

function ctx(workspaceRoot: string): CreateNodesContextV2 {
  return {
    workspaceRoot,
    nxJsonConfiguration: {},
  } as unknown as CreateNodesContextV2;
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

describe('nx-cloudflare createNodesV2', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = setupWorkspace();
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('matches wrangler configs by extension', () => {
    expect(configGlob).toBe('**/wrangler.{toml,jsonc,json}');
  });

  it('infers the five Worker targets for a valid jsonc config', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(
      workspaceRoot,
      'apps/worker/wrangler.jsonc',
      '{\n  // a worker\n  "name": "worker",\n  "main": "src/index.ts"\n}'
    );

    const result = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const targets = result.projects['apps/worker'].targets;

    expect(Object.keys(targets).sort()).toEqual(
      ['deploy', 'serve', 'tail', 'typegen', 'version-upload'].sort()
    );

    // Why: serve is the local dev server and must stay alive across the run.
    expect(targets.serve).toMatchObject({
      command: 'wrangler dev',
      options: { cwd: 'apps/worker' },
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
      tailTargetName: 'logs',
    });
    const targets = result.projects['apps/worker'].targets;

    expect(Object.keys(targets).sort()).toEqual(
      ['dev', 'logs', 'publish', 'types', 'upload'].sort()
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
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    writeFile(workspaceRoot, 'apps/bad/project.json', '{"name":"bad"}');
    writeFile(workspaceRoot, 'apps/bad/wrangler.jsonc', '{ not valid json ');

    const result = await run(workspaceRoot, 'apps/bad/wrangler.jsonc');

    expect(result).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('skips an empty toml config and warns', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    writeFile(workspaceRoot, 'apps/empty/project.json', '{"name":"empty"}');
    writeFile(workspaceRoot, 'apps/empty/wrangler.toml', '   \n  ');

    const result = await run(workspaceRoot, 'apps/empty/wrangler.toml');

    expect(result).toEqual({});
    expect(warn).toHaveBeenCalled();
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

  it('returns identical targets across repeated runs (cache safe)', async () => {
    writeFile(workspaceRoot, 'apps/worker/project.json', '{"name":"worker"}');
    writeFile(workspaceRoot, 'apps/worker/wrangler.jsonc', '{"name":"worker"}');

    const first = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');
    const second = await run(workspaceRoot, 'apps/worker/wrangler.jsonc');

    expect(second).toEqual(first);
    expect(second.projects['apps/worker'].targets.typegen).toMatchObject({
      cache: true,
    });
  });
});
