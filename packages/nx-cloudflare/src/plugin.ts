import { dirname, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import {
  type CreateNodesContext,
  type CreateNodes,
  type TargetConfiguration,
  createNodesFromFiles,
  logger,
  parseJson,
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
  /**
   * Name for the inferred `wrangler versions deploy` target.
   * @default 'version-deploy'
   */
  versionDeployTargetName?: string;
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
    versionDeployTargetName:
      options?.versionDeployTargetName ?? 'version-deploy',
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
  ): TargetConfiguration => {
    const { options: extraOptions, ...rest } = extra;
    return {
      command,
      options: { cwd: projectRoot, ...extraOptions },
      ...rest,
    };
  };

  return {
    [options.serveTargetName]: run('wrangler dev', {
      continuous: true,
      // `wrangler dev` prints "[wrangler:info] Ready on http://..." once the
      // local server is actually listening. Gate dependent tasks on that,
      // replacing the old serve executor's waitForPortOpen readiness check.
      options: { readyWhen: 'Ready on' },
    }),
    [options.deployTargetName]: run('wrangler deploy'),
    [options.typegenTargetName]: run('wrangler types', {
      cache: true,
      inputs: ['default', '^default', { externalDependencies: ['wrangler'] }],
      outputs: ['{projectRoot}/worker-configuration.d.ts'],
    }),
    [options.versionUploadTargetName]: run('wrangler versions upload'),
    [options.versionDeployTargetName]: run('wrangler versions deploy'),
    [options.tailTargetName]: run('wrangler tail', { continuous: true }),
  };
}

/**
 * Read and validate a wrangler config. Returns its raw content when valid, or
 * null (after warning) when the file is unreadable, an empty `.toml`, or
 * json/jsonc that fails to parse. The gate is structural, not semantic: a
 * parseable but minimal config (e.g. `{}`) is accepted, since Wrangler
 * validates its own contents at runtime. `.toml` has no parser here, so
 * non-empty is the only available proxy for "usable". The validated content is
 * returned (callers treat it as a truthy validity signal).
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

function createNodesInternal(
  configFile: string,
  options: CloudflarePluginOptions | undefined,
  context: CreateNodesContext
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
  if (readValidConfig(absConfigPath) === null) {
    return {};
  }

  const targets = buildWorkerTargets(projectRoot, normalizeOptions(options));
  return { projects: { [projectRoot]: { targets } } };
}

/**
 * Nx inference plugin. For every `wrangler.{toml,jsonc,json}` that sits beside a
 * `project.json`/`package.json` and parses, infers the Worker lifecycle targets
 * (serve, deploy, typegen, version-upload, version-deploy, tail). Inference is
 * intentionally uncached. Official Nx plugins (@nx/vite, @nx/eslint, @nx/jest)
 * memoize their createNodes targets in a `workspaceDataDirectory` cache keyed by
 * a project file + lockfile hash, but the work here is trivial — per config a
 * dir read, one config read+parse, and building a small static targets object —
 * so a cache earns only marginal speed while adding staleness risk across plugin
 * upgrades (no key can capture a change in this code's target-construction
 * logic). `@naxodev/gonx`'s createNodes is likewise uncached.
 */
export const createNodes: CreateNodes<CloudflarePluginOptions> = [
  '**/wrangler.{toml,jsonc,json}',
  (configFiles, options, context) =>
    createNodesFromFiles(createNodesInternal, configFiles, options, context),
];
