import { afterEach, describe, it, expect } from 'bun:test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { parse } from 'jsonc-parser';
import {
  buildProvisionCommand,
  parseProvisionOutput,
  persistProvisionedId,
  PROVISION_SENTINEL,
  type ProvisionOptions,
} from './provision';

const baseOptions = (
  overrides: Partial<ProvisionOptions> = {}
): ProvisionOptions => ({
  type: 'kv',
  binding: 'MY_KV',
  name: 'my-kv',
  projectRoot: 'apps/w',
  configPath: 'apps/w/wrangler.jsonc',
  ...overrides,
});

describe('buildProvisionCommand', () => {
  it('creates a KV namespace by binding title', () => {
    expect(buildProvisionCommand(baseOptions({ type: 'kv' }))).toEqual({
      command: 'wrangler',
      args: ['kv', 'namespace', 'create', '--title', 'MY_KV'],
    });
  });

  it('creates R2/D1/Queue resources by name', () => {
    expect(
      buildProvisionCommand(baseOptions({ type: 'r2', name: 'my-bucket' })).args
    ).toEqual(['r2', 'bucket', 'create', 'my-bucket']);
    expect(
      buildProvisionCommand(baseOptions({ type: 'd1', name: 'my-db' })).args
    ).toEqual(['d1', 'create', 'my-db']);
    expect(
      buildProvisionCommand(baseOptions({ type: 'queue', name: 'my-queue' }))
        .args
    ).toEqual(['queues', 'create', 'my-queue']);
  });
});

describe('parseProvisionOutput', () => {
  it('parses a KV id from a TOML-style line and strips quotes', () => {
    const stdout = `🌀 Creating namespace with title "w-MY_KV"
✨ Success!
[[kv_namespaces]]
binding = "MY_KV"
id = "0f2ac74b498b48028cb68387c421e279"`;
    expect(parseProvisionOutput('kv', stdout)).toEqual({
      id: '0f2ac74b498b48028cb68387c421e279',
    });
  });

  it('parses a KV id from a JSONC snippet', () => {
    const stdout = `Add the following to your configuration file:
{
  "kv_namespaces": [
    { "binding": "MY_KV", "id": "abc123def456" }
  ]
}`;
    expect(parseProvisionOutput('kv', stdout)).toEqual({ id: 'abc123def456' });
  });

  it('parses a D1 database_id (not the literal "id")', () => {
    const stdout = `✅ Successfully created DB 'my-db'
[[d1_databases]]
binding = "MY_DB"
database_name = "my-db"
database_id = "62ab3e6d-1234-5678-9abc-def012345678"`;
    expect(parseProvisionOutput('d1', stdout)).toEqual({
      id: '62ab3e6d-1234-5678-9abc-def012345678',
    });
  });

  it('returns no id for R2 and Queue (addressed by name)', () => {
    expect(parseProvisionOutput('r2', 'bucket created')).toEqual({});
    expect(parseProvisionOutput('queue', 'queue created')).toEqual({});
  });

  it('throws when no id can be parsed from KV/D1 output', () => {
    expect(() => parseProvisionOutput('kv', 'unexpected output')).toThrow(
      'Could not parse resource id'
    );
  });
});

describe('persistProvisionedId', () => {
  // persistProvisionedId writes to the real filesystem (post-flush), joining
  // workspaceRoot + configPath. Stage a throwaway config under the workspace
  // root and clean it up after each test.
  const tmpRel = 'tmp/binding-provision-spec';
  const configRel = `${tmpRel}/wrangler.jsonc`;
  const configAbs = join(workspaceRoot, configRel);

  function writeConfig(json: unknown): void {
    mkdirSync(join(workspaceRoot, tmpRel), { recursive: true });
    writeFileSync(configAbs, JSON.stringify(json, null, 2));
  }
  function readConfig(): Record<string, unknown> {
    return parse(readFileSync(configAbs, 'utf-8'));
  }

  afterEach(() => {
    rmSync(join(workspaceRoot, tmpRel), { recursive: true, force: true });
  });

  it('replaces the KV sentinel with the captured id in the matching entry', () => {
    writeConfig({
      name: 'w',
      kv_namespaces: [{ binding: 'MY_KV', id: PROVISION_SENTINEL }],
    });

    persistProvisionedId(configRel, 'kv', 'MY_KV', 'real-kv-id');

    const config = readConfig();
    expect((config.kv_namespaces as { id: string }[])[0].id).toBe('real-kv-id');
    expect(readFileSync(configAbs, 'utf-8')).not.toContain(PROVISION_SENTINEL);
  });

  it('writes the D1 id into database_id', () => {
    writeConfig({
      name: 'w',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'app',
          database_id: PROVISION_SENTINEL,
        },
      ],
    });

    persistProvisionedId(configRel, 'd1', 'DB', 'real-d1-id');

    expect((readConfig().d1_databases as { database_id: string }[])[0]).toEqual(
      {
        binding: 'DB',
        database_name: 'app',
        database_id: 'real-d1-id',
      }
    );
  });

  it('only touches the matching binding, leaving an unrelated sentinel intact', () => {
    writeConfig({
      kv_namespaces: [
        { binding: 'MY_KV', id: PROVISION_SENTINEL },
        { binding: 'OTHER_KV', id: PROVISION_SENTINEL },
      ],
    });

    persistProvisionedId(configRel, 'kv', 'MY_KV', 'real-kv-id');

    const entries = readConfig().kv_namespaces as {
      binding: string;
      id: string;
    }[];
    expect(entries[0].id).toBe('real-kv-id');
    expect(entries[1].id).toBe(PROVISION_SENTINEL);
  });

  it('throws (surfacing the id) when the binding entry cannot be found', () => {
    writeConfig({
      kv_namespaces: [{ binding: 'MY_KV', id: PROVISION_SENTINEL }],
    });

    expect(() =>
      persistProvisionedId(configRel, 'kv', 'MISSING', 'real-kv-id')
    ).toThrow('real-kv-id');
  });

  it('is a no-op for R2/Queue (addressed by name, no id field)', () => {
    writeConfig({ r2_buckets: [{ binding: 'ASSETS', bucket_name: 'assets' }] });
    const before = readFileSync(configAbs, 'utf-8');

    persistProvisionedId(configRel, 'r2', 'ASSETS', 'ignored');
    persistProvisionedId(configRel, 'queue', 'ANY', 'ignored');

    expect(readFileSync(configAbs, 'utf-8')).toBe(before);
  });
});
