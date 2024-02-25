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

  const vitePackage =
    schema.unitTestRunner === 'vitest' ? { vitest: '^0.33.0' } : {};

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
      '@naxodev/nx-cloudflare': nxCloudflareVersion,
      ...vitePackage,
    }
  );
}

export default initGenerator;
export const initSchematic = convertNxGenerator(initGenerator);
