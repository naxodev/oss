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
  try {
    const graph = await createProjectGraphAsync({ exitOnError: false });
    const root = graph.nodes[name]?.data.root;
    if (root) {
      return root;
    }
  } catch {
    // Fall through to the not-found error below.
  }
  const available = [...projects.keys()];
  throw new Error(
    `Project "${name}" not found.` +
      (available.length ? ` Available projects: ${available.join(', ')}` : '')
  );
}
