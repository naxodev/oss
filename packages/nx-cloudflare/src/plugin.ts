import { dirname } from 'node:path';
import {
  type CreateNodesContextV2,
  type CreateNodesV2,
  type TargetConfiguration,
  createNodesFromFiles,
} from '@nx/devkit';

/** Options to rename the inferred Cloudflare Worker targets. */
export interface CloudflarePluginOptions {
  serveTargetName?: string;
  deployTargetName?: string;
  typegenTargetName?: string;
  versionUploadTargetName?: string;
  tailTargetName?: string;
}

interface NormalizedOptions {
  serveTargetName: string;
  deployTargetName: string;
  typegenTargetName: string;
  versionUploadTargetName: string;
  tailTargetName: string;
}

function normalizeOptions(
  options: CloudflarePluginOptions | undefined
): NormalizedOptions {
  return {
    serveTargetName: options?.serveTargetName ?? 'serve',
    deployTargetName: options?.deployTargetName ?? 'deploy',
    typegenTargetName: options?.typegenTargetName ?? 'typegen',
    versionUploadTargetName: options?.versionUploadTargetName ?? 'version-upload',
    tailTargetName: options?.tailTargetName ?? 'tail',
  };
}

/**
 * Build the Wrangler lifecycle targets for a project. Each target shells out to
 * the Wrangler CLI via `nx:run-commands` (the `command` shorthand), run from the
 * project root so Wrangler resolves its own config.
 */
function buildWorkerTargets(
  projectRoot: string,
  options: NormalizedOptions
): Record<string, TargetConfiguration> {
  const run = (
    command: string,
    extra: Partial<TargetConfiguration> = {}
  ): TargetConfiguration => ({
    command,
    options: { cwd: projectRoot },
    ...extra,
  });

  return {
    [options.serveTargetName]: run('wrangler dev', { continuous: true }),
    [options.deployTargetName]: run('wrangler deploy'),
    [options.typegenTargetName]: run('wrangler types', {
      cache: true,
      inputs: ['default', '^default', { externalDependencies: ['wrangler'] }],
      outputs: ['{projectRoot}/worker-configuration.d.ts'],
    }),
    [options.versionUploadTargetName]: run('wrangler versions upload'),
    [options.tailTargetName]: run('wrangler tail', { continuous: true }),
  };
}

function createNodesInternal(
  configFile: string,
  options: CloudflarePluginOptions | undefined,
  _context: CreateNodesContextV2
) {
  const projectRoot = dirname(configFile);
  const targets = buildWorkerTargets(projectRoot, normalizeOptions(options));
  return { projects: { [projectRoot]: { targets } } };
}

export const createNodesV2: CreateNodesV2<CloudflarePluginOptions> = [
  '**/wrangler.{toml,jsonc,json}',
  (configFiles, options, context) =>
    createNodesFromFiles(
      (configFile, opts, ctx) => createNodesInternal(configFile, opts, ctx),
      configFiles,
      options,
      context
    ),
];
