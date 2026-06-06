import { dirname, join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  type CreateNodesContextV2,
  type CreateNodesV2,
  type TargetConfiguration,
  cacheDir,
  createNodesFromFiles,
  logger,
  parseJson,
  readJsonFile,
  writeJsonFile,
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
 * Read and validate a wrangler config. Returns its raw content when valid, or
 * null (after warning) when the file is unreadable, an empty .toml, or
 * unparseable json/jsonc. Returning the content lets callers reuse the single
 * read for cache-key hashing instead of reading the file twice.
 */
function readValidConfig(absConfigPath: string): string | null {
  let content: string;
  try {
    content = readFileSync(absConfigPath, 'utf-8');
  } catch (e) {
    logger.warn(`[nx-cloudflare] Could not read ${absConfigPath}: ${e}`);
    return null;
  }

  if (absConfigPath.endsWith('.toml')) {
    if (content.trim().length === 0) {
      logger.warn(
        `[nx-cloudflare] Skipping empty wrangler config ${absConfigPath}`
      );
      return null;
    }
    return content;
  }

  try {
    parseJson(content);
    return content;
  } catch (e) {
    logger.warn(
      `[nx-cloudflare] Skipping unparseable wrangler config ${absConfigPath}: ${e}`
    );
    return null;
  }
}

type TargetsCache = Record<string, Record<string, TargetConfiguration>>;

function readTargetsCache(cachePath: string): TargetsCache {
  try {
    return existsSync(cachePath) ? readJsonFile(cachePath) : {};
  } catch {
    return {};
  }
}

function writeTargetsCache(cachePath: string, cache: TargetsCache): void {
  writeJsonFile(cachePath, cache);
}

function createNodesInternal(
  configFile: string,
  options: CloudflarePluginOptions | undefined,
  context: CreateNodesContextV2,
  targetsCache: TargetsCache
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

  const absConfigPath = join(context.workspaceRoot, configFile);
  const content = readValidConfig(absConfigPath);
  if (content === null) {
    return {};
  }

  const normalized = normalizeOptions(options);
  const cacheKey = createHash('sha256')
    .update(configFile)
    .update(content)
    .update(JSON.stringify(normalized))
    .digest('hex');

  targetsCache[cacheKey] ??= buildWorkerTargets(projectRoot, normalized);

  return { projects: { [projectRoot]: { targets: targetsCache[cacheKey] } } };
}

export const createNodesV2: CreateNodesV2<CloudflarePluginOptions> = [
  '**/wrangler.{toml,jsonc,json}',
  async (configFiles, options, context) => {
    const optionsHash = createHash('sha256')
      .update(JSON.stringify(options ?? {}))
      .digest('hex');
    const cachePath = join(cacheDir, `nx-cloudflare-${optionsHash}.hash`);
    const targetsCache = readTargetsCache(cachePath);
    try {
      return await createNodesFromFiles(
        (configFile, opts, ctx) =>
          createNodesInternal(configFile, opts, ctx, targetsCache),
        configFiles,
        options,
        context
      );
    } finally {
      writeTargetsCache(cachePath, targetsCache);
    }
  },
];
