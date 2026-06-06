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
  /** Name for the inferred `wrangler dev` target. @default 'serve' */
  serveTargetName?: string;
  /** Name for the inferred `wrangler deploy` target. @default 'deploy' */
  deployTargetName?: string;
  /** Name for the inferred `wrangler types` target. @default 'typegen' */
  typegenTargetName?: string;
  /**
   * Name for the inferred `wrangler versions upload` target.
   * @default 'version-upload'
   */
  versionUploadTargetName?: string;
  /** Name for the inferred `wrangler tail` target. @default 'tail' */
  tailTargetName?: string;
}

/** {@link CloudflarePluginOptions} with every default applied. */
type NormalizedOptions = Required<CloudflarePluginOptions>;

/** Render an unknown thrown value as a concise, log-friendly reason. */
function errorReason(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
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
 * null (after warning) when the file is unreadable, an empty `.toml`, or
 * json/jsonc that fails to parse. The gate is structural, not semantic: a
 * parseable but minimal config (e.g. `{}`) is accepted, since Wrangler
 * validates its own contents at runtime. `.toml` has no parser here, so
 * non-empty is the only available proxy for "usable". Returning the content
 * lets callers reuse the single read for cache-key hashing instead of reading
 * the file twice.
 */
function readValidConfig(absConfigPath: string): string | null {
  let content: string;
  try {
    content = readFileSync(absConfigPath, 'utf-8');
  } catch (e) {
    logger.warn(
      `[nx-cloudflare] Could not read ${absConfigPath}: ${errorReason(e)}`
    );
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
      `[nx-cloudflare] Skipping unparseable wrangler config ${absConfigPath}: ${errorReason(
        e
      )}`
    );
    return null;
  }
}

type TargetsCache = Record<string, ReturnType<typeof buildWorkerTargets>>;

function readTargetsCache(cachePath: string): TargetsCache {
  if (!existsSync(cachePath)) {
    return {};
  }
  // A present-but-unreadable cache (corruption, a format change after an Nx
  // bump, permissions) recomputes targets rather than failing the graph, but
  // is surfaced so the degraded caching isn't silent.
  try {
    return readJsonFile(cachePath);
  } catch (e) {
    logger.warn(
      `[nx-cloudflare] Ignoring unreadable targets cache ${cachePath}; ` +
        `recomputing targets. Reason: ${errorReason(e)}`
    );
    return {};
  }
}

function writeTargetsCache(cachePath: string, cache: TargetsCache): void {
  // The cache is a best-effort optimization: a write failure must neither abort
  // graph construction nor mask an in-flight error from the caller's try block.
  try {
    writeJsonFile(cachePath, cache);
  } catch (e) {
    logger.warn(
      `[nx-cloudflare] Could not write targets cache ${cachePath}; ` +
        `targets will be recomputed next run. Reason: ${errorReason(e)}`
    );
  }
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
  let siblings: string[];
  try {
    siblings = readdirSync(join(context.workspaceRoot, projectRoot));
  } catch (e) {
    logger.warn(
      `[nx-cloudflare] Could not read project directory ${projectRoot}: ${errorReason(
        e
      )}`
    );
    return {};
  }
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
  // The cache file is already partitioned by an options hash (see below), so the
  // per-entry key only needs to distinguish projects by path and content.
  const cacheKey = createHash('sha256')
    .update(configFile)
    .update(content)
    .digest('hex');

  targetsCache[cacheKey] ??= buildWorkerTargets(projectRoot, normalized);

  return { projects: { [projectRoot]: { targets: targetsCache[cacheKey] } } };
}

/**
 * Nx inference plugin. For every `wrangler.{toml,jsonc,json}` that sits beside a
 * `project.json`/`package.json` and parses, infers the Worker lifecycle targets
 * (serve, deploy, typegen, version-upload, tail). The per-config target
 * calculation is memoized in a cache file under `cacheDir`, keyed by the plugin
 * options so different option sets never share entries.
 */
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
