import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as devkit from '@nx/devkit';
import { Tree, updateJson, joinPathFragments } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { resolveProjectRootOrThrow } from './project';

// Register a project.json-less package in the Tree so `getProjects` sees it.
function seedProject(tree: Tree, root: string, name: string): void {
  updateJson(tree, 'package.json', (pkg) => ({
    ...pkg,
    workspaces: [...(pkg.workspaces ?? []), `${root}/package.json`],
  }));
  tree.write(joinPathFragments(root, 'package.json'), JSON.stringify({ name }));
}

describe('resolveProjectRootOrThrow', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  afterEach(() => {
    // spyOn mocks are restored per-test below; nothing global to reset.
  });

  it('returns a tree-visible project root without touching the project graph', async () => {
    seedProject(tree, 'apps/w', 'w');
    const graph = spyOn(devkit, 'createProjectGraphAsync');

    expect(await resolveProjectRootOrThrow(tree, 'w')).toBe('apps/w');
    expect(graph).not.toHaveBeenCalled();

    graph.mockRestore();
  });

  it('falls back to the project graph for an inference-only project', async () => {
    const graph = spyOn(devkit, 'createProjectGraphAsync').mockResolvedValue({
      nodes: { infer: { data: { root: 'apps/infer' } } },
    } as unknown as Awaited<ReturnType<typeof devkit.createProjectGraphAsync>>);

    expect(await resolveProjectRootOrThrow(tree, 'infer')).toBe('apps/infer');

    graph.mockRestore();
  });

  it('throws "not found" when neither the tree nor the graph has the project', async () => {
    seedProject(tree, 'apps/w', 'w');
    const graph = spyOn(devkit, 'createProjectGraphAsync').mockResolvedValue({
      nodes: {},
    } as unknown as Awaited<ReturnType<typeof devkit.createProjectGraphAsync>>);

    await expect(resolveProjectRootOrThrow(tree, 'ghost')).rejects.toThrow(
      'Project "ghost" not found. Available projects: w'
    );

    graph.mockRestore();
  });

  it('surfaces a graph-build failure (naming project + cause) instead of "not found"', async () => {
    const graph = spyOn(devkit, 'createProjectGraphAsync').mockRejectedValue(
      new Error('graph computation boom')
    );

    // Why: a broken sibling project should surface the real failure — naming the
    // requested project AND the underlying cause — not a misleading "not found".
    const err = await resolveProjectRootOrThrow(tree, 'anything').then(
      () => null,
      (e: unknown) => (e instanceof Error ? e.message : String(e))
    );
    expect(err).toContain('Could not resolve project "anything"');
    expect(err).toContain('project graph failed to build');
    expect(err).toContain('graph computation boom');
    expect(err).not.toContain('not found');

    graph.mockRestore();
  });
});
