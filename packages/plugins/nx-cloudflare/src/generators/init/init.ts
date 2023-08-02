import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  formatFiles,
  removeDependenciesFromPackageJson,
  Tree,
} from '@nx/devkit';
import { initGenerator as nodeInitGenerator } from '@nx/node';
import { tslibVersion } from '@nx/node/src/utils/versions';
import type { Schema } from './schema';
import {
  cloudflareWorkersTypeVersions,
  nxCloudflareVersion,
  wranglerVersion,
} from '../../utils/versions';

function updateDependencies(tree: Tree, schema: Schema) {
  removeDependenciesFromPackageJson(tree, ['@naxodev/nx-cloudflare'], []);

  const vitePackage =
    schema.unitTestRunner === 'vitest' ? { vite: '^0.33.0' } : {};

  return addDependenciesToPackageJson(
    tree,
    {
      tslib: tslibVersion,
    },
    {
      wrangler: wranglerVersion,
      '@cloudflare/workers-types': cloudflareWorkersTypeVersions,
      '@naxodev/nx-cloudflare': nxCloudflareVersion,
      ...vitePackage,
    }
  );
}

export async function initGenerator(tree: Tree, schema: Schema) {
  const initTask = await nodeInitGenerator(tree, {
    ...schema,
    skipFormat: true,
    unitTestRunner:
      schema.unitTestRunner == 'vitest' ? 'none' : schema.unitTestRunner,
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

export default initGenerator;
export const initSchematic = convertNxGenerator(initGenerator);
