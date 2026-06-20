import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type CreateNodesContext } from '@nx/devkit';
import { createNodes, type BunTestPluginOptions } from './plugin';

const [configGlob, createNodesFn] = createNodes;

function setupWorkspace(): string {
  return mkdtempSync(join(tmpdir(), 'bun-test-plugin-'));
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

async function run(
  workspaceRoot: string,
  configFile: string,
  options: BunTestPluginOptions = {}
): Promise<{ projects: Record<string, { targets: Record<string, unknown> }> }> {
  const results = await createNodesFn(
    [configFile],
    options,
    ctx(workspaceRoot)
  );
  return results[0][1] as {
    projects: Record<string, { targets: Record<string, unknown> }>;
  };
}

describe('bun-test createNodes', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = setupWorkspace();
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('exposes the tsconfig.spec.json glob', () => {
    expect(configGlob).toBe('**/tsconfig.spec.json');
  });

  it('infers a cacheable bun test target for a spec-bearing project', async () => {
    writeFile(workspaceRoot, 'packages/lib/project.json', '{"name":"lib"}');
    writeFile(workspaceRoot, 'packages/lib/tsconfig.spec.json', '{}');

    const result = await run(workspaceRoot, 'packages/lib/tsconfig.spec.json');
    const targets = result.projects['packages/lib'].targets;

    expect(targets.test).toEqual({
      command: 'bun ../../tools/scripts/bun-test.ts',
      options: { cwd: '{projectRoot}' },
      cache: true,
      inputs: [
        'default',
        '^production',
        '{workspaceRoot}/tools/scripts/bun-test.ts',
      ],
      metadata: {
        technologies: ['bun'],
        description: 'Run unit tests with bun test (per-file isolation)',
      },
    });
  });

  it('honors a custom testTargetName', async () => {
    writeFile(workspaceRoot, 'packages/lib/project.json', '{"name":"lib"}');
    writeFile(workspaceRoot, 'packages/lib/tsconfig.spec.json', '{}');

    const result = await run(workspaceRoot, 'packages/lib/tsconfig.spec.json', {
      testTargetName: 'unit',
    });
    const targets = result.projects['packages/lib'].targets;

    expect(Object.keys(targets)).toEqual(['unit']);
  });

  it('skips e2e projects (project.json declares an e2e target)', async () => {
    writeFile(
      workspaceRoot,
      'packages/app-e2e/project.json',
      '{"name":"app-e2e","targets":{"e2e":{"command":"bun test"}}}'
    );
    writeFile(workspaceRoot, 'packages/app-e2e/tsconfig.spec.json', '{}');

    // Bypass the narrowed `run()` helper: an excluded project yields an empty
    // result object, which the helper's return type intentionally disallows.
    const results = await createNodesFn(
      ['packages/app-e2e/tsconfig.spec.json'],
      {},
      ctx(workspaceRoot)
    );
    expect(results[0][1]).toEqual({});
  });

  it('infers when there is no sibling project.json', async () => {
    writeFile(workspaceRoot, 'packages/pkg/package.json', '{"name":"pkg"}');
    writeFile(workspaceRoot, 'packages/pkg/tsconfig.spec.json', '{}');

    const result = await run(workspaceRoot, 'packages/pkg/tsconfig.spec.json');
    expect(result.projects['packages/pkg'].targets.test).toBeDefined();
  });
});
