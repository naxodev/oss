import { describe, it, expect, beforeEach } from 'bun:test';
import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  applyProductionToggles,
  applyProductionTogglesToProject,
} from './wrangler-config';

const CONFIG = `{
  // a worker
  "name": "worker",
  "main": "src/index.ts"
}
`;

describe('applyProductionToggles', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('apps/w/wrangler.jsonc', CONFIG);
  });

  it('enables observability, creating the nested key and preserving comments', () => {
    applyProductionToggles(tree, 'apps/w/wrangler.jsonc', {
      observability: true,
    });
    const out = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    expect(out).toContain('// a worker');
    expect(out).toContain('"observability"');
    expect(out).toContain('"enabled": true');
    // Not requested -> not written.
    expect(out).not.toContain('placement');
  });

  it('sets Smart Placement mode', () => {
    applyProductionToggles(tree, 'apps/w/wrangler.jsonc', {
      smartPlacement: true,
    });
    const out = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    expect(out).toContain('"placement"');
    expect(out).toContain('"mode": "smart"');
    expect(out).not.toContain('observability');
  });

  it('applies both toggles in a single write', () => {
    applyProductionToggles(tree, 'apps/w/wrangler.jsonc', {
      observability: true,
      smartPlacement: true,
    });
    const out = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    expect(out).toContain('"enabled": true');
    expect(out).toContain('"mode": "smart"');
    expect(out).toContain('// a worker');
  });

  it('is idempotent for the same toggles', () => {
    applyProductionToggles(tree, 'apps/w/wrangler.jsonc', {
      observability: true,
      smartPlacement: true,
    });
    const once = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    applyProductionToggles(tree, 'apps/w/wrangler.jsonc', {
      observability: true,
      smartPlacement: true,
    });
    const twice = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
    expect(twice).toBe(once);
  });

  it('throws when the config is missing', () => {
    expect(() =>
      applyProductionToggles(tree, 'apps/w/missing.jsonc', {
        observability: true,
      })
    ).toThrow('wrangler config not found');
  });
});

describe('applyProductionTogglesToProject', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('locates the jsonc config and applies the toggles, returning true', () => {
    tree.write('apps/w/wrangler.jsonc', CONFIG);

    const applied = applyProductionTogglesToProject(
      tree,
      'apps/w',
      { observability: true },
      'test'
    );

    expect(applied).toBe(true);
    expect(tree.read('apps/w/wrangler.jsonc', 'utf-8')!).toContain(
      '"enabled": true'
    );
  });

  it('returns false when the project has no wrangler config', () => {
    const applied = applyProductionTogglesToProject(
      tree,
      'apps/w',
      { observability: true },
      'test'
    );

    expect(applied).toBe(false);
  });

  it('throws (labeling the caller) for a non-jsonc config', () => {
    tree.write('apps/w/wrangler.toml', 'name = "w"\n');

    expect(() =>
      applyProductionTogglesToProject(
        tree,
        'apps/w',
        { smartPlacement: true },
        'worker-config'
      )
    ).toThrow('worker-config only supports wrangler.jsonc');
  });
});
