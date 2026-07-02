import { createProjectGraphAsync, getProjects, Tree } from '@nx/devkit';

/**
 * Resolve a project's root, preferring the Tree (which sees project.json /
 * package.json projects — and is all that's available in generator unit tests)
 * and falling back to the project graph, the only source that sees an
 * inference-only Worker: one with no project.json that the createNodes plugin
 * registers from its wrangler config. `getProjects` deliberately skips
 * inference, so without this fallback such Workers are invisible to a generator.
 *
 * Throws with the available project names when the name matches neither source.
 * When the graph itself fails to build (a broken sibling project, a plugin
 * failure), the error is surfaced — naming both the project and the real cause —
 * rather than swallowed into a misleading "project not found".
 */
export async function resolveProjectRootOrThrow(
  tree: Tree,
  name: string
): Promise<string> {
  const projects = getProjects(tree);
  const fromTree = projects.get(name);
  if (fromTree) {
    return fromTree.root;
  }

  let graph: Awaited<ReturnType<typeof createProjectGraphAsync>>;
  try {
    graph = await createProjectGraphAsync({ exitOnError: false });
  } catch (e) {
    // The name isn't tree-visible, so we fell back to the graph — and building
    // it failed. Report that (with its cause) instead of masking it as a plain
    // "not found", which would send the user to fix the wrong thing.
    throw new Error(
      `Could not resolve project "${name}": the Nx project graph failed to build ` +
        `(${
          e instanceof Error ? e.message : String(e)
        }). Fix that error, then re-run.`
    );
  }

  const root = graph.nodes[name]?.data.root;
  if (root) {
    return root;
  }
  const available = [...projects.keys()];
  throw new Error(
    `Project "${name}" not found.` +
      (available.length ? ` Available projects: ${available.join(', ')}` : '')
  );
}
