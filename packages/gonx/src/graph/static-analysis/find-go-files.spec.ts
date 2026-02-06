import { Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { findGoFiles } from './find-go-files';

jest.mock('fs/promises');
jest.mock('@nx/devkit', () => ({ logger: { warn: jest.fn() } }));

const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;

function dirent(name: string, type: 'file' | 'directory'): Dirent {
  return {
    name,
    isFile: () => type === 'file',
    isDirectory: () => type === 'directory',
  } as Dirent;
}

/**
 * Sets up mockReaddir to simulate a filesystem from a flat file map.
 * Keys are absolute file paths, values are ignored (only structure matters).
 */
function setupFs(files: Record<string, string>): void {
  const dirs = new Map<string, Dirent[]>();

  for (const filePath of Object.keys(files)) {
    const segments = filePath.split('/').filter(Boolean);

    for (let i = 1; i <= segments.length; i++) {
      const dirPath = '/' + segments.slice(0, i - 1).join('/') || '/';
      const entryName = segments[i - 1];
      const isFile = i === segments.length;

      if (!dirs.has(dirPath)) {
        dirs.set(dirPath, []);
      }

      const entries = dirs.get(dirPath)!;
      if (!entries.some((e) => e.name === entryName)) {
        entries.push(dirent(entryName, isFile ? 'file' : 'directory'));
      }
    }
  }

  mockReaddir.mockImplementation(async (dirPath: any) => {
    const entries = dirs.get(dirPath as string);
    if (!entries) {
      throw Object.assign(
        new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`),
        { code: 'ENOENT' }
      );
    }
    return entries as any;
  });
}

describe('findGoFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReaddir.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    );
  });

  describe('basic file discovery', () => {
    it('should find Go files in root directory', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/utils.go': 'package main',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).toContain('/project/utils.go');
      expect(files).toHaveLength(2);
    });

    it('should find Go files recursively', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/internal/handler.go': 'package internal',
        '/project/internal/deep/nested.go': 'package deep',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).toContain('/project/internal/handler.go');
      expect(files).toContain('/project/internal/deep/nested.go');
      expect(files).toHaveLength(3);
    });
  });

  describe('exclusions', () => {
    it('should include test files', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/main_test.go': 'package main',
        '/project/handler.go': 'package handler',
        '/project/handler_test.go': 'package handler',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).toContain('/project/handler.go');
      expect(files).toContain('/project/main_test.go');
      expect(files).toContain('/project/handler_test.go');
      expect(files).toHaveLength(4);
    });

    it('should exclude vendor directory', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/vendor/github.com/pkg/pkg.go': 'package pkg',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).not.toContain('/project/vendor/github.com/pkg/pkg.go');
      expect(files).toHaveLength(1);
    });

    it('should exclude testdata directory', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/testdata/fixtures.go': 'package testdata',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).not.toContain('/project/testdata/fixtures.go');
      expect(files).toHaveLength(1);
    });

    it('should exclude hidden directories', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/.git/hooks/pre-commit.go': 'package hooks',
        '/project/.hidden/secret.go': 'package hidden',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).not.toContain('/project/.git/hooks/pre-commit.go');
      expect(files).not.toContain('/project/.hidden/secret.go');
      expect(files).toHaveLength(1);
    });

    it('should exclude node_modules directory', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/node_modules/some-pkg/index.go': 'package somepkg',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).not.toContain('/project/node_modules/some-pkg/index.go');
      expect(files).toHaveLength(1);
    });

    it('should exclude build output directories', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/dist/main.go': 'package main',
        '/project/build/main.go': 'package main',
        '/project/out/main.go': 'package main',
        '/project/bin/main.go': 'package main',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).not.toContain('/project/dist/main.go');
      expect(files).not.toContain('/project/build/main.go');
      expect(files).not.toContain('/project/out/main.go');
      expect(files).not.toContain('/project/bin/main.go');
      expect(files).toHaveLength(1);
    });

    it('should exclude generated code directories', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/gen/models.go': 'package gen',
        '/project/generated/types.go': 'package generated',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).not.toContain('/project/gen/models.go');
      expect(files).not.toContain('/project/generated/types.go');
      expect(files).toHaveLength(1);
    });

    it('should exclude temporary directories', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/tmp/scratch.go': 'package tmp',
        '/project/temp/scratch.go': 'package temp',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).not.toContain('/project/tmp/scratch.go');
      expect(files).not.toContain('/project/temp/scratch.go');
      expect(files).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for non-existent directory', async () => {
      const files = await findGoFiles('/nonexistent');

      expect(files).toEqual([]);
    });

    it('should return empty array for directory with no Go files', async () => {
      setupFs({
        '/project/readme.md': '# README',
        '/project/config.json': '{}',
      });

      const files = await findGoFiles('/project');

      expect(files).toEqual([]);
    });

    it('should ignore non-.go files', async () => {
      setupFs({
        '/project/main.go': 'package main',
        '/project/readme.md': '# README',
        '/project/Makefile': 'all:',
        '/project/go.mod': 'module example.com/project',
      });

      const files = await findGoFiles('/project');

      expect(files).toContain('/project/main.go');
      expect(files).toHaveLength(1);
    });
  });
});
