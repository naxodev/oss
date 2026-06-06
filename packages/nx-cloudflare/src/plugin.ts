import { dirname, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import {
  type CreateNodesContextV2,
  type CreateNodesV2,
  type TargetConfiguration,
  createNodesFromFiles,
  logger,
  parseJson,
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
    versionUploadTargetName:
      options?.versionUploadTargetName ?? 'version-upload',
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

/**
 * A wrangler config is "valid enough" to infer targets from when:
 *  - json/jsonc parses (comments allowed), or
 *  - toml is readable and non-empty (toml is legacy; we do not add a parser).
 * Returns false and warns on failure so the project is skipped, not silently.
 */
function configIsValid(absConfigPath: string): boolean {
  let content: string;
  try {
    content = readFileSync(absConfigPath, 'utf-8');
  } catch (e) {
    logger.warn(`[nx-cloudflare] Could not read ${absConfigPath}: ${e}`);
    return false;
  }

  if (absConfigPath.endsWith('.toml')) {
    if (content.trim().length === 0) {
      logger.warn(
        `[nx-cloudflare] Skipping empty wrangler config ${absConfigPath}`
      );
      return false;
    }
    return true;
  }

  try {
    parseJson(content);
    return true;
  } catch (e) {
    logger.warn(
      `[nx-cloudflare] Skipping unparseable wrangler config ${absConfigPath}: ${e}`
    );
    return false;
  }
}

function createNodesInternal(
  configFile: string,
  options: CloudflarePluginOptions | undefined,
  context: CreateNodesContextV2
) {
  const projectRoot = dirname(configFile);

  // Only infer targets for real Nx projects: a sibling project.json or
  // package.json. Otherwise this wrangler file is not a project root.
  const siblings = readdirSync(join(context.workspaceRoot, projectRoot));
  if (
    !siblings.includes('project.json') &&
    !siblings.includes('package.json')
  ) {
    return {};
  }

  if (!configIsValid(join(context.workspaceRoot, configFile))) {
    return {};
  }

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
