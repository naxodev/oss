import { formatFiles, Tree } from '@nx/devkit';
import { ensureGoSourceNamedInput } from '../../utils';

/**
 * Backfills the workspace-level `goSource` named input into nx.json for
 * workspaces upgrading an already-installed gonx.
 *
 * As of this release, gonx-inferred build/test/lint/tidy targets hash
 * `^goSource`, which Nx resolves against *each dependency project's own*
 * namedInputs. A Go project with a graph edge (e.g. `implicitDependencies`)
 * to a project that does not define `goSource` would otherwise make Nx's
 * hasher abort with "Input 'goSource' is not defined". The `init` generator
 * writes this fallback for fresh setups (see `ensureGoSourceNamedInput`);
 * this migration adds it for existing consumers, who never re-run `init`.
 *
 * A user-defined `goSource` is never overwritten, and for non-Go projects
 * the fallback patterns simply match nothing, so it is a safe default.
 */
export default async function update(tree: Tree): Promise<void> {
  ensureGoSourceNamedInput(tree);
  await formatFiles(tree);
}
