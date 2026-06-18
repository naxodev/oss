import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  formatFiles,
  Tree,
} from '@nx/devkit';
import { initGenerator as nodeInitGenerator } from '@nx/js';
import type { InitGeneratorSchema } from './schema';
import {
  cloudflareWorkersTypeVersions,
  tslibVersion,
  vitestPoolWorkersVersion,
  vitestVersion,
  wranglerVersion,
} from '../../utils/versions';
import { ensurePluginRegistered } from '../../utils/inference-plugin';

export async function initGenerator(tree: Tree, schema: InitGeneratorSchema) {
  const initTask = await nodeInitGenerator(tree, {
    ...schema,
    skipFormat: true,
  });

  const installTask = updateDependencies(tree);
  ensurePluginRegistered(tree);
  if (!schema.skipFormat) {
    await formatFiles(tree);
  }

  return async () => {
    await initTask();
    await installTask();
  };
}

function updateDependencies(tree: Tree) {
  // We intentionally do not add `@naxodev/nx-cloudflare` itself: the plugin
  // invoking this generator is already installed, so re-pinning it is
  // redundant and previously collided with the e2e's file: install. This
  // mirrors how @naxodev/gonx's init leaves the plugin alone.
  return addDependenciesToPackageJson(
    tree,
    {
      tslib: tslibVersion,
    },
    {
      wrangler: wranglerVersion,
      '@cloudflare/workers-types': cloudflareWorkersTypeVersions,
      '@cloudflare/vitest-pool-workers': vitestPoolWorkersVersion,
      vitest: vitestVersion,
    }
  );
}

export default initGenerator;
export const initSchematic = convertNxGenerator(initGenerator);
