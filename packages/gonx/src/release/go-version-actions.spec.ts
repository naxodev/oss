import { describe, it, expect } from 'bun:test';
import type { ProjectGraph, Tree } from '@nx/devkit';
import GoVersionActions from './go-version-actions';

// Minimal construction helper. The constructor performs no side effects — it
// only assigns fields; the side-effecting `init(tree)` is never called here —
// and the behavior under test reads none of those fields, so empty stubs are
// sufficient to exercise the public method.
function createActions(): GoVersionActions {
  return new GoVersionActions(
    {} as ConstructorParameters<typeof GoVersionActions>[0],
    {
      name: 'proj-b',
      type: 'lib',
      data: { root: 'libs/proj-b' },
    } as ConstructorParameters<typeof GoVersionActions>[1],
    {} as ConstructorParameters<typeof GoVersionActions>[2]
  );
}

describe('GoVersionActions', () => {
  describe('readCurrentVersionOfDependency', () => {
    // Reproduces #91: nx release on a Go release group fails because this method
    // threw "Method not implemented". Go resolves local (workspace) dependencies
    // by path, never by a version spec in go.mod, so there is no dependency
    // version to read — we must report null rather than throw, which tells
    // nx release there is no dependency version spec to update.
    it('reports no applicable dependency version instead of throwing', async () => {
      const actions = createActions();

      // `.resolves` (not a bare await) makes the regression explicit: before
      // #91 this rejected with "Method not implemented", aborting nx release.
      await expect(
        actions.readCurrentVersionOfDependency(
          {} as Tree,
          {} as ProjectGraph,
          'proj-a'
        )
      ).resolves.toEqual({
        currentVersion: null,
        dependencyCollection: null,
      });
    });
  });
});
