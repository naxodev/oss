import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { importDirectoryToTree } from './import-tree';

describe('importDirectoryToTree', () => {
  let tree: Tree;
  let source: string;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    source = mkdtempSync(join(tmpdir(), 'c3-import-'));
  });

  afterEach(() => {
    rmSync(source, { recursive: true, force: true });
  });

  const writeFixture = (relPath: string, content: string) => {
    const abs = join(source, relPath);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  };

  it('copies nested files from the source dir into the tree at destRoot', () => {
    writeFixture('src/index.ts', 'export default {};');

    importDirectoryToTree(tree, source, 'apps/worker');

    expect(tree.read('apps/worker/src/index.ts', 'utf-8')).toBe(
      'export default {};'
    );
  });

  it('skips nested install artifacts (node_modules, lockfiles, .git)', () => {
    writeFixture('package.json', '{"name":"w"}');
    writeFixture('node_modules/dep/index.js', 'module.exports = 1;');
    writeFixture('pnpm-lock.yaml', 'lockfileVersion: 9');
    writeFixture('package-lock.json', '{}');
    writeFixture('.git/config', '[core]');

    importDirectoryToTree(tree, source, 'apps/worker');

    expect(tree.exists('apps/worker/package.json')).toBe(true);
    expect(tree.exists('apps/worker/node_modules/dep/index.js')).toBe(false);
    expect(tree.exists('apps/worker/pnpm-lock.yaml')).toBe(false);
    expect(tree.exists('apps/worker/package-lock.json')).toBe(false);
    expect(tree.exists('apps/worker/.git/config')).toBe(false);
  });
});
