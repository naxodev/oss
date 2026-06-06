import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  formatFiles,
  readNxJson,
  Tree,
  updateNxJson,
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

const INFERENCE_PLUGIN = '@naxodev/nx-cloudflare/plugin';

// Register the createNodesV2 inference plugin so Worker targets
// (serve/deploy/typegen/version-upload/tail) are inferred from the wrangler
// config. Idempotent: matches both the string and object plugin forms.
function ensurePluginRegistered(tree: Tree): void {
  const nxJson = readNxJson(tree) ?? {};
  const plugins = nxJson.plugins ?? [];
  const alreadyRegistered = plugins.some((p) =>
    typeof p === 'string'
      ? p === INFERENCE_PLUGIN
      : p.plugin === INFERENCE_PLUGIN
  );
  if (alreadyRegistered) {
    return;
  }
  nxJson.plugins = [...plugins, INFERENCE_PLUGIN];
  updateNxJson(tree, nxJson);
}

export async function initGenerator(tree: Tree, schema: InitGeneratorSchema) {
  const initTask = await nodeInitGenerator(tree, {
    ...schema,
    skipFormat: true,
  });

  const installTask = updateDependencies(tree, schema);
  ensurePluginRegistered(tree);
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
