import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as devkit from '@nx/devkit';
import { Tree, joinPathFragments, updateJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { workerConfigGenerator } from './generator';

const WRANGLER_JSONC = `{
  "name": "my-worker",
  "main": "src/index.ts"
}
`;

function seedWorker(
  tree: Tree,
  projectRoot: string,
  projectName: string
): void {
  updateJson(tree, 'package.json', (pkg) => ({
    ...pkg,
    workspaces: [...(pkg.workspaces ?? []), `${projectRoot}/package.json`],
  }));
  tree.write(
    joinPathFragments(projectRoot, 'package.json'),
    JSON.stringify({ name: projectName })
  );
  tree.write(joinPathFragments(projectRoot, 'wrangler.jsonc'), WRANGLER_JSONC);
}

describe('worker-config generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('enables observability', async () => {
    seedWorker(tree, 'apps/w', 'w');
    await workerConfigGenerator(tree, { project: 'w', observability: true });
    const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    expect(config).toContain('"observability"');
    expect(config).toContain('"enabled": true');
  });

  it('enables Smart Placement', async () => {
    seedWorker(tree, 'apps/w', 'w');
    await workerConfigGenerator(tree, { project: 'w', smartPlacement: true });
    const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    expect(config).toContain('"placement"');
    expect(config).toContain('"mode": "smart"');
  });

  it('applies both toggles together', async () => {
    seedWorker(tree, 'apps/w', 'w');
    await workerConfigGenerator(tree, {
      project: 'w',
      observability: true,
      smartPlacement: true,
    });
    const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    expect(config).toContain('"observability"');
    expect(config).toContain('"placement"');
  });

  it('throws when neither toggle is passed', async () => {
    seedWorker(tree, 'apps/w', 'w');
    await expect(workerConfigGenerator(tree, { project: 'w' })).rejects.toThrow(
      'pass --observability'
    );
  });

  it('throws for a non-jsonc (toml) config', async () => {
    updateJson(tree, 'package.json', (pkg) => ({
      ...pkg,
      workspaces: [...(pkg.workspaces ?? []), 'apps/t/package.json'],
    }));
    tree.write('apps/t/package.json', JSON.stringify({ name: 't' }));
    tree.write('apps/t/wrangler.toml', 'name = "t"\n');
    await expect(
      workerConfigGenerator(tree, { project: 't', observability: true })
    ).rejects.toThrow('only supports wrangler.jsonc');
  });

  it('throws when the project is not found', async () => {
    // Stub the graph fallback so it resolves to an empty graph instead of
    // building the real Nx project graph (and daemon) against the /virtual
    // test workspace — an unbounded call that otherwise times the spec out.
    const graph = spyOn(devkit, 'createProjectGraphAsync').mockResolvedValue({
      nodes: {},
    } as unknown as Awaited<ReturnType<typeof devkit.createProjectGraphAsync>>);

    await expect(
      workerConfigGenerator(tree, { project: 'nope', observability: true })
    ).rejects.toThrow('not found');

    graph.mockRestore();
  });
});
