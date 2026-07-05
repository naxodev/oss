import { readFileSync } from 'node:fs';
import { joinPathFragments, offsetFromRoot, Tree } from '@nx/devkit';
import {
  applyEdits,
  modify,
  parse,
  printParseErrorCode,
  type FormattingOptions,
  type JSONPath,
  type ParseError,
} from 'jsonc-parser';

/**
 * The wrangler config `$schema`, pointed at a workspace-root-relative path. In a
 * hoisted monorepo `wrangler` lives in the root `node_modules`, not the project's,
 * so an `offsetFromRoot`-relative path is what lets editors validate the config.
 */
export function wranglerSchemaPath(projectRoot: string): string {
  return `${offsetFromRoot(
    projectRoot
  )}node_modules/wrangler/config-schema.json`;
}

export const WRANGLER_CONFIG_FILES = [
  'wrangler.jsonc',
  'wrangler.json',
  'wrangler.toml',
] as const;

export const JSONC_CONFIG_EXTENSIONS = ['.jsonc', '.json'];

// The single jsonc-parser formatting convention every edit in this module (and
// its callers) writes with.
export const FORMATTING: FormattingOptions = {
  tabSize: 2,
  insertSpaces: true,
  insertFinalNewline: true,
};

export function findWranglerConfig(
  tree: Tree,
  projectRoot: string
): string | null {
  for (const file of WRANGLER_CONFIG_FILES) {
    const path = joinPathFragments(projectRoot, file);
    if (tree.exists(path)) {
      return path;
    }
  }
  return null;
}

export function isJsoncConfig(configPath: string): boolean {
  return JSONC_CONFIG_EXTENSIONS.some((ext) => configPath.endsWith(ext));
}

export function assertJsoncConfig(
  configPath: string,
  caller = 'This generator'
): void {
  if (!isJsoncConfig(configPath)) {
    throw new Error(
      `${caller} only supports wrangler.jsonc and wrangler.json. ` +
        `Your project uses ${configPath.split('/').pop()}. ` +
        `Convert it to wrangler.jsonc first, then re-run the generator.`
    );
  }
}

// Read a wrangler config's text off the generator Tree, or throw a consistent
// error when it is missing/empty. Single source of that guard for every
// Tree-based reader/writer below.
function readConfigTextOrThrow(tree: Tree, configPath: string): string {
  const text = tree.read(configPath, 'utf-8');
  if (!text) {
    throw new Error(`wrangler config not found or empty: ${configPath}`);
  }
  return text;
}

/**
 * Read a wrangler config's raw text from the real filesystem, for the two
 * callers that operate outside the generator Tree (the inference plugin, and
 * post-flush provisioning). Throws the underlying fs error on a missing file —
 * callers decide how to handle that (the inference plugin warns and skips a
 * config; provisioning lets a missing config surface as a hard failure).
 */
export function readWranglerConfigTextFromFile(absConfigPath: string): string {
  return readFileSync(absConfigPath, 'utf-8');
}

/**
 * Best-effort parse: salvages a partial result even from a malformed config
 * (jsonc-parser's default, error-tolerant behavior). Used wherever the config
 * is assumed already valid — the generators and provisioning only ever edit a
 * config that a prior generator run (or the user) already wrote.
 */
export function parseWranglerConfig(text: string): Record<string, unknown> {
  return parse(text) as Record<string, unknown>;
}

/**
 * Strict parse: throws a descriptive error when the text contains any parse
 * errors, instead of silently salvaging a partial result. Used by the
 * inference plugin's validity gate, which must distinguish a genuinely broken
 * config (skip inference, warn) from a merely unusual one.
 */
export function parseWranglerConfigStrict(
  text: string
): Record<string, unknown> {
  const errors: ParseError[] = [];
  const result = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const { error, offset } = errors[0];
    throw new Error(`${printParseErrorCode(error)} at offset ${offset}`);
  }
  return result as Record<string, unknown>;
}

export function readWranglerConfig(
  tree: Tree,
  configPath: string
): Record<string, unknown> {
  return parseWranglerConfig(readConfigTextOrThrow(tree, configPath));
}

function getAtPath(obj: unknown, path: JSONPath): unknown {
  let current: unknown = obj;
  for (const segment of path) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment as string];
  }
  return current;
}

function indexInArray(
  config: Record<string, unknown>,
  arrayPath: JSONPath,
  field: string,
  value: string
): number {
  const arr = getAtPath(config, arrayPath);
  if (!Array.isArray(arr)) {
    return -1;
  }
  return arr.findIndex(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      (entry as Record<string, unknown>)[field] === value
  );
}

/**
 * Whether the array at `arrayPath` — top-level (`['kv_namespaces']`) or nested
 * (`['durable_objects', 'bindings']`) — has an entry whose `field` === `value`.
 */
export function findInArray(
  config: Record<string, unknown>,
  arrayPath: JSONPath,
  field: string,
  value: string
): boolean {
  return indexInArray(config, arrayPath, field, value) !== -1;
}

/**
 * Index of the entry in the array at `arrayPath` whose `field` === `value`, or
 * -1 if the array is absent or no entry matches.
 */
export function findIndexInArray(
  config: Record<string, unknown>,
  arrayPath: JSONPath,
  field: string,
  value: string
): number {
  return indexInArray(config, arrayPath, field, value);
}

/**
 * Append `entry` to the array at `arrayPath` — top-level or nested (e.g.
 * `['queues', 'producers']`). `modify` creates any missing intermediate
 * objects/arrays, so this also handles "first binding of this kind" without a
 * separate branch.
 */
export function appendToArray(
  tree: Tree,
  configPath: string,
  arrayPath: JSONPath,
  entry: Record<string, unknown>
): void {
  const text = readConfigTextOrThrow(tree, configPath);
  const config = parseWranglerConfig(text);
  const arr = getAtPath(config, arrayPath);
  const index = Array.isArray(arr) ? arr.length : 0;
  const edits = modify(text, [...arrayPath, index], entry, {
    isArrayInsertion: true,
    formattingOptions: FORMATTING,
  });
  tree.write(configPath, applyEdits(text, edits));
}

export function getMigrationCount(config: Record<string, unknown>): number {
  const migrations = config['migrations'];
  return Array.isArray(migrations) ? migrations.length : 0;
}

// Whether any migration already introduces `className` (via new_classes or
// new_sqlite_classes). A Durable Object class is introduced by exactly one
// migration, so this guards against emitting a duplicate that wrangler rejects.
export function migrationDefinesClass(
  config: Record<string, unknown>,
  className: string
): boolean {
  const migrations = config['migrations'];
  if (!Array.isArray(migrations)) {
    return false;
  }
  return migrations.some((m) => {
    if (typeof m !== 'object' || m === null) {
      return false;
    }
    const entry = m as Record<string, unknown>;
    return ['new_sqlite_classes', 'new_classes'].some(
      (key) =>
        Array.isArray(entry[key]) &&
        (entry[key] as unknown[]).includes(className)
    );
  });
}

export interface D1DatabaseBinding {
  binding: string;
  database_name: string;
}

/**
 * Extract `d1_databases` entries that carry a non-empty `binding` and
 * `database_name`. A malformed entry is dropped rather than thrown on;
 * `onInvalidEntry` lets the caller warn with its own context (e.g. the config
 * file path) instead of baking one message into this accessor.
 */
export function getD1Databases(
  config: Record<string, unknown>,
  onInvalidEntry?: (entry: unknown) => void
): D1DatabaseBinding[] {
  const list = config['d1_databases'];
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
    onInvalidEntry?.(entry);
    return [];
  });
}

// The opt-in production-readiness toggles the application and worker-config
// generators write. This is the single source of the flag -> config-key mapping.
export interface ProductionToggles {
  observability?: boolean;
  smartPlacement?: boolean;
}

// Apply the requested production-readiness toggles to a jsonc/json wrangler
// config in a single read/write: `observability.enabled = true` and/or
// `placement.mode = "smart"`. jsonc-parser preserves comments and creates any
// intermediate objects. Idempotent. Throws if the config is missing/empty.
export function applyProductionToggles(
  tree: Tree,
  configPath: string,
  toggles: ProductionToggles
): void {
  let text = readConfigTextOrThrow(tree, configPath);
  if (toggles.observability) {
    text = applyEdits(
      text,
      modify(text, ['observability', 'enabled'], true, {
        formattingOptions: FORMATTING,
      })
    );
  }
  if (toggles.smartPlacement) {
    text = applyEdits(
      text,
      modify(text, ['placement', 'mode'], 'smart', {
        formattingOptions: FORMATTING,
      })
    );
  }
  tree.write(configPath, text);
}

// Locate a project's wrangler config and apply the production toggles to it.
// Shared by the application and worker-config generators. Returns `false` when
// the project has no wrangler config (the caller decides whether that is fatal);
// throws via `assertJsoncConfig` when the config is a non-jsonc format that
// can't be edited safely. `caller` labels that error for the invoking generator.
export function applyProductionTogglesToProject(
  tree: Tree,
  projectRoot: string,
  toggles: ProductionToggles,
  caller: string
): boolean {
  const configPath = findWranglerConfig(tree, projectRoot);
  if (!configPath) {
    return false;
  }
  assertJsoncConfig(configPath, caller);
  applyProductionToggles(tree, configPath, toggles);
  return true;
}
