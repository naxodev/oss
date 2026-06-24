import { joinPathFragments, Tree } from '@nx/devkit';
import {
  applyEdits,
  modify,
  parse,
  type FormattingOptions,
  type JSONPath,
} from 'jsonc-parser';

export const WRANGLER_CONFIG_FILES = [
  'wrangler.jsonc',
  'wrangler.json',
  'wrangler.toml',
] as const;

export const JSONC_CONFIG_EXTENSIONS = ['.jsonc', '.json'];

const DEFAULT_FORMATTING: FormattingOptions = {
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

export function assertJsoncConfig(configPath: string): void {
  if (!isJsoncConfig(configPath)) {
    throw new Error(
      `The binding generator only supports wrangler.jsonc and wrangler.json. ` +
        `Your project uses ${configPath.split('/').pop()}. ` +
        `Convert it to wrangler.jsonc first, then re-run the generator.`
    );
  }
}

export function readWranglerConfig(
  tree: Tree,
  configPath: string
): Record<string, unknown> {
  const text = tree.read(configPath, 'utf-8');
  if (!text) {
    throw new Error(`wrangler config not found or empty: ${configPath}`);
  }
  return parse(text) as Record<string, unknown>;
}

export function appendToArray(
  tree: Tree,
  configPath: string,
  arrayPath: JSONPath,
  entry: Record<string, unknown>
): void {
  const text = tree.read(configPath, 'utf-8');
  if (!text) {
    throw new Error(`wrangler config not found or empty: ${configPath}`);
  }
  const config = parse(text) as Record<string, unknown>;
  const arr = getAtPath(config, arrayPath);
  const index = Array.isArray(arr) ? arr.length : 0;
  const edits = modify(text, [...arrayPath, index], entry, {
    isArrayInsertion: true,
    formattingOptions: DEFAULT_FORMATTING,
  });
  tree.write(configPath, applyEdits(text, edits));
}

export function findInArray(
  config: Record<string, unknown>,
  arrayPath: JSONPath,
  field: string,
  value: string
): boolean {
  const arr = getAtPath(config, arrayPath);
  if (!Array.isArray(arr)) {
    return false;
  }
  return arr.some(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      (entry as Record<string, unknown>)[field] === value
  );
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
