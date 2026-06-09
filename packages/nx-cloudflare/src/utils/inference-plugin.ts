import { readNxJson, updateNxJson, type Tree } from '@nx/devkit';

export const INFERENCE_PLUGIN = '@naxodev/nx-cloudflare/plugin';

// Register the createNodesV2 inference plugin so Worker targets
// (serve/deploy/typegen/version-upload/tail) are inferred from the wrangler
// config. Idempotent: matches both the string and object plugin forms. Shared
// by the init generator (fresh apps) and the move-to-inference migration
// (existing workspaces).
export function ensurePluginRegistered(tree: Tree): void {
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
