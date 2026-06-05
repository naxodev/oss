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
  honoVersion,
  tslibVersion,
  vitestPoolWorkersVersion,
  vitestVersion,
  wranglerVersion,
} from '../../utils/versions';

export async function initGenerator(tree: Tree, schema: InitGeneratorSchema) {
  const initTask = await nodeInitGenerator(tree, {
    ...schema,
    skipFormat: true,
  });

  const installTask = updateDependencies(tree, schema);
  if (!schema.skipFormat) {
    await formatFiles(tree);
  }

  return async () => {
    await initTask();
    await installTask();
  };
}

function updateDependencies(tree: Tree, schema: InitGeneratorSchema) {
  // We intentionally do not add `@naxodev/nx-cloudflare` itself: the plugin
  // invoking this generator is already installed, so re-pinning it is
  // redundant and previously collided with the e2e's file: install. This
  // mirrors how @naxodev/gonx's init leaves the plugin alone.
  const honoPackage = schema.template === 'hono' ? { hono: honoVersion } : {};

  return addDependenciesToPackageJson(
    tree,
    {
      tslib: tslibVersion,
      ...honoPackage,
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
