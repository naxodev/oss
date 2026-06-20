import {
  formatFiles,
  getProjects,
  logger,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { ensurePluginRegistered } from '../../utils/inference-plugin';

// Executors deleted in the 7.0.0 cluster: serve/deploy (#137, with deploy's
// `publish` alias) and next-build (#126). Targets that referenced them now come
// from the createNodes inference plugin (serve/deploy) or are gone entirely
// (next-build), so the hard-written project.json targets must be removed — left
// in place they error with "Cannot find executor".
const REMOVED_EXECUTORS = new Set([
  '@naxodev/nx-cloudflare:serve',
  '@naxodev/nx-cloudflare:deploy',
  '@naxodev/nx-cloudflare:publish',
  '@naxodev/nx-cloudflare:next-build',
]);

export default async function update(tree: Tree): Promise<void> {
  for (const [name, project] of getProjects(tree)) {
    const targets = project.targets;
    if (!targets) {
      continue;
    }
    let changed = false;
    for (const [targetName, target] of Object.entries(targets)) {
      if (target?.executor && REMOVED_EXECUTORS.has(target.executor)) {
        // The inferred targets run Wrangler directly and carry no options, so a
        // target the consumer customized loses that config. Surface it loudly
        // rather than dropping it silently — these belong in the wrangler config
        // (compatibility, routes, vars, [dev].port, ...) or as passthrough args.
        const optionKeys = Object.keys(target.options ?? {});
        if (optionKeys.length > 0) {
          logger.warn(
            `[nx-cloudflare] Removed ${name}:${targetName} (${target.executor}); ` +
              `its options [${optionKeys.join(
                ', '
              )}] are not carried over to the ` +
              `inferred target. Move them into the wrangler config or pass them as args.`
          );
        }
        delete targets[targetName];
        changed = true;
      }
    }
    if (changed) {
      updateProjectConfiguration(tree, name, project);
    }
  }

  // Register the inference plugin once so the stripped serve/deploy targets are
  // re-provided by createNodes.
  ensurePluginRegistered(tree);

  await formatFiles(tree);
}
