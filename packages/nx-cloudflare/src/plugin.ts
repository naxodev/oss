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
  /** Name for the inferred `wrangler d1 migrations apply` target. @default 'd1-apply' */
  d1ApplyTargetName?: string;
  /** Name for the inferred `wrangler d1 migrations create` target. @default 'd1-create' */
  d1CreateTargetName?: string;
  /** Name for the inferred `wrangler d1 migrations list` target. @default 'd1-list' */
  d1ListTargetName?: string;
  /** Name for the inferred `wrangler secret put` target. @default 'secret-put' */
  secretPutTargetName?: string;
  /** Name for the inferred `wrangler secret bulk` target. @default 'secret-bulk' */
  secretBulkTargetName?: string;
  /** Name for the inferred `wrangler secret list` target. @default 'secret-list' */
  secretListTargetName?: string;
  /** Name for the inferred `wrangler secret delete` target. @default 'secret-delete' */
  secretDeleteTargetName?: string;
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
    d1ApplyTargetName: options?.d1ApplyTargetName ?? 'd1-apply',
    d1CreateTargetName: options?.d1CreateTargetName ?? 'd1-create',
    d1ListTargetName: options?.d1ListTargetName ?? 'd1-list',
    secretPutTargetName: options?.secretPutTargetName ?? 'secret-put',
    secretBulkTargetName: options?.secretBulkTargetName ?? 'secret-bulk',
    secretListTargetName: options?.secretListTargetName ?? 'secret-list',
    secretDeleteTargetName: options?.secretDeleteTargetName ?? 'secret-delete',
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
 * Read and validate a wrangler config. Returns `{ parsed }` when valid, or null
 * (after warning) when the file is unreadable, an empty `.toml`, or json/jsonc
 * that fails to parse. The gate is structural, not semantic: a parseable but
 * minimal config (e.g. `{}`) is accepted, since Wrangler validates its own
 * contents at runtime. `.toml` has no parser here, so non-empty is the only
 * available proxy for "usable" and `parsed` is null for it. The parsed object is
 * returned so callers can gate on validity (`=== null` means skip) and reuse it
 * for D1 extraction without a second read + parse.
 */
function readValidConfig(
  absConfigPath: string
): { parsed: Record<string, unknown> | null } | null {
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
    // No TOML parser here — valid (non-empty) but unparsed. D1 inference needs
    // the parsed object, so it is jsonc/json only.
    return { parsed: null };
  }

  try {
    return { parsed: parseJson(content) as Record<string, unknown> };
  } catch (e) {
    logger.warn(
      `[nx-cloudflare] Skipping unparseable wrangler config ${absConfigPath}: ${errorReason(
        e
      )}`
    );
    return null;
  }
}

interface D1Database {
  binding: string;
  database_name: string;
}

/**
 * Extract `d1_databases` entries that carry a non-empty `binding` and
 * `database_name`. `parsed` is null for TOML/unparsed configs (D1 targets are
 * jsonc/json-only by design), which yield no D1 targets. A malformed entry is
 * warned about and skipped rather than dropped silently: inference must never
 * throw, but it should still tell the user why a declared database produced no
 * targets (matching `readValidConfig`'s warn-and-skip convention).
 */
function readD1Databases(
  absConfigPath: string,
  parsed: Record<string, unknown> | null
): D1Database[] {
  if (parsed === null) {
    return [];
  }
  const list = parsed['d1_databases'];
  if (!Array.isArray(list)) {
    return [];
  }
  return list.flatMap((entry) => {
    if (typeof entry === 'object' && entry !== null) {
      const { binding, database_name } = entry as Record<string, unknown>;
      if (
        typeof binding === 'string' &&
        binding.length > 0 &&
        typeof database_name === 'string' &&
        database_name.length > 0
      ) {
        return [{ binding, database_name }];
      }
    }
    logger.warn(
      `[nx-cloudflare] Skipping a d1_databases entry in ${absConfigPath} that lacks a non-empty string \`binding\`/\`database_name\`.`
    );
    return [];
  });
}

/** D1 migration targets, one trio per database. Suffixed by binding when >1. */
function buildD1Targets(
  options: NormalizedOptions,
  databases: D1Database[]
): Record<string, TargetConfiguration> {
  const single = databases.length === 1;
  const targets: Record<string, TargetConfiguration> = {};
  for (const db of databases) {
    const suffix = single ? '' : `-${db.binding}`;
    const d1 = (command: string): TargetConfiguration => ({
      executor: '@naxodev/nx-cloudflare:d1',
      options: { command, database: db.database_name },
    });
    targets[`${options.d1ApplyTargetName}${suffix}`] = d1('apply');
    targets[`${options.d1CreateTargetName}${suffix}`] = d1('create');
    targets[`${options.d1ListTargetName}${suffix}`] = d1('list');
  }
  return targets;
}

/** Secret targets — always emitted (secrets never appear in the config). */
function buildSecretTargets(
  options: NormalizedOptions
): Record<string, TargetConfiguration> {
  const secret = (command: string): TargetConfiguration => ({
    executor: '@naxodev/nx-cloudflare:secret',
    options: { command },
  });
  return {
    [options.secretPutTargetName]: secret('put'),
    [options.secretBulkTargetName]: secret('bulk'),
    [options.secretListTargetName]: secret('list'),
    [options.secretDeleteTargetName]: secret('delete'),
  };
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
  const config = readValidConfig(absConfigPath);
  if (config === null) {
    return {};
  }

  const normalized = normalizeOptions(options);
  const targets = {
    ...buildWorkerTargets(projectRoot, normalized),
    ...buildD1Targets(
      normalized,
      readD1Databases(absConfigPath, config.parsed)
    ),
    ...buildSecretTargets(normalized),
  };
  return { projects: { [projectRoot]: { targets } } };
}

/**
 * Nx inference plugin. For every `wrangler.{toml,jsonc,json}` that sits beside a
 * `project.json`/`package.json` and parses, infers the Worker lifecycle targets
 * (serve, deploy, typegen, version-upload, version-deploy, tail), secret
 * management targets (secret-put, secret-bulk, secret-list, secret-delete) for
 * every Worker, and D1 migration targets (d1-apply, d1-create, d1-list — one
 * set per `d1_databases` binding, jsonc/json only). Inference is intentionally
 * uncached. Official Nx plugins (@nx/vite, @nx/eslint, @nx/jest) memoize their
 * createNodes targets in a `workspaceDataDirectory` cache keyed by a project
 * file + lockfile hash, but the work here is trivial — per config a dir read,
 * one config read+parse, and building a small static targets object — so a
 * cache earns only marginal speed while adding staleness risk across plugin
 * upgrades (no key can capture a change in this code's target-construction
 * logic). `@naxodev/gonx`'s createNodes is likewise uncached.
 */
export const createNodes: CreateNodes<CloudflarePluginOptions> = [
  '**/wrangler.{toml,jsonc,json}',
  (configFiles, options, context) =>
    createNodesFromFiles(createNodesInternal, configFiles, options, context),
];
