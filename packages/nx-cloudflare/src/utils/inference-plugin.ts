import { readNxJson, updateNxJson, type Tree } from '@nx/devkit';

export const INFERENCE_PLUGIN = '@naxodev/nx-cloudflare/plugin';

// Register a createNodes plugin in nx.json — installing a package doesn't
// register it, and without registration its inferred targets never appear.
// Idempotent: matches both the string and object plugin forms. Defaults to
// this package's inference plugin, so Worker targets
// (serve/deploy/typegen/version-upload/tail) are inferred from the wrangler
// config. Shared by the init and create-cloudflare generators (fresh apps,
// where create-cloudflare also registers @nx/vitest) and the
// move-to-inference migration (existing workspaces).
export function ensurePluginRegistered(
  tree: Tree,
  plugin: string = INFERENCE_PLUGIN
): void {
  const nxJson = readNxJson(tree) ?? {};
  const plugins = nxJson.plugins ?? [];
  const alreadyRegistered = plugins.some((p) =>
    typeof p === 'string' ? p === plugin : p.plugin === plugin
  );
  if (alreadyRegistered) {
    return;
  }
  nxJson.plugins = [...plugins, plugin];
  updateNxJson(tree, nxJson);
}
