import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  formatFiles,
  removeDependenciesFromPackageJson,
  Tree,
} from '@nx/devkit';
import { initGenerator as nodeInitGenerator } from '@nx/js';
import { tslibVersion } from '@nx/node/src/utils/versions';
import type { InitGeneratorSchema } from './schema';
import {
  cloudflareWorkersTypeVersions,
  honoVersion,
  nxCloudflareVersion,
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
  removeDependenciesFromPackageJson(tree, ['@naxodev/nx-cloudflare'], []);

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
      '@naxodev/nx-cloudflare': nxCloudflareVersion,
      vitest: vitestVersion,
    }
  );
}

export default initGenerator;
export const initSchematic = convertNxGenerator(initGenerator);
