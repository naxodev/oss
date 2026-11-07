import { describe, it, expect, mock, beforeEach } from 'bun:test';

const mockFormatFiles = mock();
mock.module('@nx/devkit', () => ({ formatFiles: mockFormatFiles }));

import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import libraryGenerator from './generator';

describe('library generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    mockFormatFiles.mockClear();
  });

  it.each(['libs/myGoLib', 'libs/myDir/myGoLib'])(
    'creates an importable Go module at the requested directory %s',
    async (directory) => {
      await libraryGenerator(tree, { name: 'myGoLib', directory });

      expect(tree.read(`${directory}/myGoLib.go`, 'utf-8')).toContain(
        'package mygolib'
      );
      expect(tree.read(`${directory}/myGoLib.go`, 'utf-8')).toContain(
        'func MyGoLib('
      );
      expect(tree.read(`${directory}/myGoLib_test.go`, 'utf-8')).toContain(
        'func TestMyGoLib'
      );
      expect(tree.read(`${directory}/go.mod`, 'utf-8')).toContain(
        `module ${directory}`
      );
      // Project configuration is inferred from Go files, not a generated manifest.
      expect(tree.exists(`${directory}/project.json`)).toBe(false);
      expect(tree.exists(`${directory}/package.json`)).toBe(false);
    }
  );

  it('formats generated files by default', async () => {
    await libraryGenerator(tree, { directory: 'myGoLib' });
    expect(mockFormatFiles).toHaveBeenCalledWith(tree);
  });

  it('allows callers to defer formatting until all generators finish', async () => {
    await libraryGenerator(tree, { directory: 'myGoLib', skipFormat: true });
    expect(mockFormatFiles).not.toHaveBeenCalled();
  });
});
