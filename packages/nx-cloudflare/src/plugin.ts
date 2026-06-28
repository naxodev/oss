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
  /**
   * Name for the inferred D1 migrations target (configurations: apply, create,
   * list). @default 'd1'
   */
  d1TargetName?: string;
  /**
   * Name for the inferred secret-management target (configurations: put, bulk,
   * list, delete). @default 'secret'
   */
  secretTargetName?: string;
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
    d1TargetName: options?.d1TargetName ?? 'd1',
    secretTargetName: options?.secretTargetName ?? 'secret',
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

/**
 * D1 migrations target. Emitted only when the config declares ≥1 `d1_databases`
 * binding. A single `d1` target carries the binding → database_name map in its
 * options and exposes the subcommands as configurations (`d1:apply`,
 * `d1:create`, `d1:list`); the database is selected at run time via `--db`.
 */
function buildD1Targets(
  options: NormalizedOptions,
  databases: D1Database[]
): Record<string, TargetConfiguration> {
  if (databases.length === 0) {
    return {};
  }
  const databaseMap: Record<string, string> = {};
  for (const db of databases) {
    databaseMap[db.binding] = db.database_name;
  }
  return {
    [options.d1TargetName]: {
      executor: '@naxodev/nx-cloudflare:d1',
      options: { databases: databaseMap },
      configurations: {
        apply: { command: 'apply' },
        create: { command: 'create' },
        list: { command: 'list' },
      },
    },
  };
}

/**
 * Secret-management target — always emitted (secrets never appear in the
 * config). A single `secret` target exposes the subcommands as configurations
 * (`secret:put`, `secret:bulk`, `secret:list`, `secret:delete`).
 */
function buildSecretTargets(
  options: NormalizedOptions
): Record<string, TargetConfiguration> {
  return {
    [options.secretTargetName]: {
      executor: '@naxodev/nx-cloudflare:secret',
      configurations: {
        put: { command: 'put' },
        bulk: { command: 'bulk' },
        list: { command: 'list' },
        delete: { command: 'delete' },
      },
    },
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
 * (serve, deploy, typegen, version-upload, version-deploy, tail), a secret
 * target with put/bulk/list/delete configurations for every Worker, and a d1
 * target with apply/create/list configurations when the config declares
 * `d1_databases` (jsonc/json only; the database is chosen with `--db`).
 * Inference is intentionally
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
