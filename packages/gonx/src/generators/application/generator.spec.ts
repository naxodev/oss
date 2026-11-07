import { describe, it, expect, mock, beforeEach } from 'bun:test';

const mockFormatFiles = mock();
mock.module('@nx/devkit', () => ({ formatFiles: mockFormatFiles }));

import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import applicationGenerator from './generator';

describe('application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    mockFormatFiles.mockClear();
  });

  it.each(['apps/myGoApp', 'apps/myDir/myGoApp'])(
    'creates a runnable Go module at the requested directory %s',
    async (directory) => {
      await applicationGenerator(tree, { name: 'myGoApp', directory });

      expect(tree.read(`${directory}/main.go`, 'utf-8')).toContain(
        'fmt.Println(Hello("myGoApp"))'
      );
      expect(tree.read(`${directory}/main_test.go`, 'utf-8')).toContain(
        'func TestHello'
      );
      expect(tree.read(`${directory}/go.mod`, 'utf-8')).toContain(
        'module mygoapp'
      );
      // Project configuration is inferred from Go files, not a generated manifest.
      expect(tree.exists(`${directory}/project.json`)).toBe(false);
      expect(tree.exists(`${directory}/package.json`)).toBe(false);
    }
  );

  it('formats generated files by default', async () => {
    await applicationGenerator(tree, { directory: 'myGoApp' });
    expect(mockFormatFiles).toHaveBeenCalledWith(tree);
  });

  it('allows callers to defer formatting until all generators finish', async () => {
    await applicationGenerator(tree, {
      directory: 'myGoApp',
      skipFormat: true,
    });
    expect(mockFormatFiles).not.toHaveBeenCalled();
  });
});
