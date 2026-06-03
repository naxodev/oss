import type { ExecutorContext } from '@nx/devkit';
import { workspaceRoot } from '@nx/devkit';
import { resolve } from 'path';
import { getProjectRoot, getProjectCwd } from './project-paths';

const context = (overrides: Record<string, unknown>): ExecutorContext =>
  ({ projectName: 'my-worker', ...overrides } as unknown as ExecutorContext);

describe('getProjectRoot', () => {
  it('reads the root from projectsConfigurations', () => {
    const ctx = context({
      projectsConfigurations: {
        version: 2,
        projects: { 'my-worker': { root: 'apps/my-worker' } },
      },
    });
    expect(getProjectRoot(ctx)).toBe('apps/my-worker');
  });

  it('falls back to the project graph node', () => {
    const ctx = context({
      projectGraph: {
        nodes: {
          'my-worker': { data: { root: 'libs/my-worker' } },
        },
      },
    });
    expect(getProjectRoot(ctx)).toBe('libs/my-worker');
  });

  it('throws a helpful error naming the project when the root is missing', () => {
    expect(() => getProjectRoot(context({}))).toThrow(/my-worker/);
  });
});

describe('getProjectCwd', () => {
  it('resolves the project root to an absolute path under the workspace root', () => {
    const ctx = context({
      projectsConfigurations: {
        version: 2,
        projects: { 'my-worker': { root: 'apps/my-worker' } },
      },
    });
    expect(getProjectCwd(ctx)).toBe(resolve(workspaceRoot, 'apps/my-worker'));
  });
});
