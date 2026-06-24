import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import {
  applyEdits,
  modify,
  parse,
  type FormattingOptions,
} from 'jsonc-parser';

export type ProvisionableType = 'kv' | 'r2' | 'd1' | 'queue';

export interface ProvisionResult {
  id?: string;
}

export interface ProvisionOptions {
  type: ProvisionableType;
  binding: string;
  name: string;
  projectRoot: string;
  configPath: string;
}

export const PROVISION_SENTINEL = '__PENDING_CREATE__';

const DEFAULT_FORMATTING: FormattingOptions = {
  tabSize: 2,
  insertSpaces: true,
  insertFinalNewline: true,
};

// Where the provisioned id lives in the config, per type. Only KV and D1 carry
// a remote-generated id (written as the PROVISION_SENTINEL until capture); R2
// buckets and Queues are addressed by their name, which is known up front.
const ID_LOCATION: Partial<
  Record<ProvisionableType, { arrayKey: string; idField: string }>
> = {
  kv: { arrayKey: 'kv_namespaces', idField: 'id' },
  d1: { arrayKey: 'd1_databases', idField: 'database_id' },
};

// Pure: build the wrangler CLI command for each provisionable type. KV/R2/D1/
// Queue are the only binding types with a `wrangler <x> create` command. The
// captured id is parsed out of stdout by `parseProvisionOutput`.
export function buildProvisionCommand(options: ProvisionOptions): {
  command: string;
  args: string[];
} {
  switch (options.type) {
    case 'kv':
      return {
        command: 'wrangler',
        args: ['kv', 'namespace', 'create', '--title', options.binding],
      };
    case 'r2':
      return {
        command: 'wrangler',
        args: ['r2', 'bucket', 'create', options.name],
      };
    case 'd1':
      return {
        command: 'wrangler',
        args: ['d1', 'create', options.name],
      };
    case 'queue':
      return {
        command: 'wrangler',
        args: ['queues', 'create', options.name],
      };
  }
}

// Side-effecting provision invocation: shells out on the real filesystem after
// the generator's virtual Tree has been flushed. Kept separate so unit tests
// can mock it (mirroring run-c3.ts). On success it records the captured id back
// into the config. Throws on any failure — `--create` is an explicit request,
// so a failed provision must surface loudly rather than leave a green run over
// a config that points at a resource which was never created.
export function provisionResource(options: ProvisionOptions): void {
  const { command, args } = buildProvisionCommand(options);
  const cwd = join(workspaceRoot, options.projectRoot);

  let stdout: string;
  try {
    stdout = execFileSync(command, args, {
      cwd,
      // Capture stderr too so wrangler's diagnostic is attached to the thrown
      // error instead of only streaming to the terminal.
      stdio: ['inherit', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });
  } catch (e) {
    const stderr =
      e && typeof e === 'object' && 'stderr' in e
        ? String((e as { stderr?: unknown }).stderr ?? '').trim()
        : '';
    const reason = stderr || (e instanceof Error ? e.message : String(e));
    throw new Error(
      `\`${command} ${args.join(' ')}\` failed. The binding was written to ` +
        `${options.configPath} but the resource was not provisioned` +
        (ID_LOCATION[options.type]
          ? ` (its id is still "${PROVISION_SENTINEL}")`
          : '') +
        `. Reason: ${reason}`
    );
  }

  const { id } = parseProvisionOutput(options.type, stdout);
  if (id) {
    persistProvisionedId(options.configPath, options.type, options.binding, id);
  }
}

// Parse the resource id from `wrangler <x> create` stdout. KV/D1 emit the id;
// R2/Queue are addressed by name and carry no id. The id appears as either a
// JSONC snippet (`"id": "abc"`) or a TOML-style line (`id = "abc"`) depending on
// the wrangler version, so accept both separators and strip surrounding quotes.
export function parseProvisionOutput(
  type: ProvisionableType,
  stdout: string
): ProvisionResult {
  if (type === 'r2' || type === 'queue') {
    return {};
  }
  const idMatch = stdout.match(
    /(?:database_)?id["']?\s*[:=]\s*["']?([^\s"',}\]]+)/i
  );
  if (!idMatch) {
    throw new Error(
      `Could not parse resource id from wrangler output:\n${stdout}`
    );
  }
  return { id: idMatch[1] };
}

// Write the captured id into the specific binding entry on the real filesystem
// (post-flush). Scoped to the entry matching `binding` so a leftover sentinel
// from an unrelated prior run is never overwritten. If the entry can't be
// found, throw with the id so the user can record it manually — the remote
// resource already exists and its id must not be lost.
export function persistProvisionedId(
  configPath: string,
  type: ProvisionableType,
  binding: string,
  id: string
): void {
  const location = ID_LOCATION[type];
  if (!location) {
    return;
  }
  const abs = join(workspaceRoot, configPath);
  const text = readFileSync(abs, 'utf-8');
  const config = parse(text) as Record<string, unknown>;
  const arr = config[location.arrayKey];
  const index = Array.isArray(arr)
    ? arr.findIndex(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          (entry as Record<string, unknown>)['binding'] === binding
      )
    : -1;
  if (index === -1) {
    throw new Error(
      `Provisioned ${type} resource (id "${id}") but could not find binding ` +
        `"${binding}" in ${configPath} to record it. Set ${location.idField} ` +
        `to "${id}" manually.`
    );
  }
  const edits = modify(text, [location.arrayKey, index, location.idField], id, {
    formattingOptions: DEFAULT_FORMATTING,
  });
  writeFileSync(abs, applyEdits(text, edits));
}
