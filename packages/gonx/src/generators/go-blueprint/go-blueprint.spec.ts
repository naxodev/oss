import { describe, it, expect, beforeEach, mock, type Mock } from 'bun:test';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { fork, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { goBlueprintGenerator } from './go-blueprint';
import { GoBlueprintGeneratorSchema } from './schema';

// Mock what we need
mock.module('child_process', () => ({
  fork: mock(),
  spawn: mock(),
}));
mock.module('../init/generator', () => ({
  initGenerator: mock().mockResolvedValue(() => Promise.resolve()),
}));

// Mock generateFiles specifically to avoid filesystem dependencies in tests
const mockedGenerateFiles = mock();
mock.module('@nx/devkit', () => ({
  ...require('@nx/devkit'),
  generateFiles: (...args: any[]) => mockedGenerateFiles(...args),
}));

const mockedFork = fork as unknown as Mock<typeof fork>;
const mockedSpawn = spawn as unknown as Mock<typeof spawn>;

describe('go-blueprint generator', () => {
  let tree: Tree;
  const options: GoBlueprintGeneratorSchema = {
    directory: 'test-app',
    driver: 'postgres',
    framework: 'gin',
    git: 'skip',
  };

  function createMockChildProcess() {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    return mockProcess;
  }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    mockedFork.mockClear();
    mockedSpawn.mockClear();
    mockedGenerateFiles.mockClear();

    // Mock successful fork by default
    const mockProcess = createMockChildProcess();
    mockedFork.mockReturnValue(mockProcess);
    mockedSpawn.mockReturnValue(mockProcess);

    // Simulate successful process completion
    setTimeout(() => {
      mockProcess.emit('close', 0);
    }, 0);
  });

  it('should complete successfully with default options', async () => {
    await goBlueprintGenerator(tree, options);

    if (process.platform === 'linux' || process.platform === 'darwin') {
      expect(mockedFork).toHaveBeenCalledWith(
        expect.stringContaining('go-blueprint'),
        [
          'create',
          '--name',
          'test-app',
          '--framework',
          'gin',
          '--driver',
          'postgres',
          '--git',
          'skip',
        ],
        expect.objectContaining({
          cwd: expect.any(String),
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        })
      );
    } else {
      expect(mockedSpawn).toHaveBeenCalledWith(
        'node',
        [
          expect.stringContaining('go-blueprint'),
          'create',
          '--name',
          'test-app',
          '--framework',
          'gin',
          '--driver',
          'postgres',
          '--git',
          'skip',
        ],
        expect.objectContaining({
          cwd: expect.any(String),
          stdio: 'inherit',
          shell: false,
          windowsVerbatimArguments: false,
        })
      );
    }
  });

  describe('command building', () => {
    it('should successfully generate with advanced features', async () => {
      const optionsWithFeatures = {
        ...options,
        feature: ['htmx', 'docker'],
      };

      await goBlueprintGenerator(tree, optionsWithFeatures);
      if (process.platform === 'linux' || process.platform === 'darwin') {
        expect(mockedFork).toHaveBeenCalledWith(
          expect.stringContaining('go-blueprint'),
          [
            'create',
            '--name',
            'test-app',
            '--framework',
            'gin',
            '--driver',
            'postgres',
            '--git',
            'skip',
            '--advanced',
            '--feature',
            'htmx',
            '--feature',
            'docker',
          ],
          expect.objectContaining({
            cwd: expect.any(String),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          })
        );
      } else {
        expect(mockedSpawn).toHaveBeenCalledWith(
          'node',
          [
            expect.stringContaining('go-blueprint'),
            'create',
            '--name',
            'test-app',
            '--framework',
            'gin',
            '--driver',
            'postgres',
            '--git',
            'skip',
            '--advanced',
            '--feature',
            'htmx',
            '--feature',
            'docker',
          ],
          expect.objectContaining({
            cwd: expect.any(String),
            stdio: 'inherit',
            shell: false,
            windowsVerbatimArguments: false,
          })
        );
      }
    });

    it('should handle directory structure correctly', async () => {
      const optionsWithNestedPath = {
        ...options,
        directory: 'apps/backend/test-app',
      };

      await goBlueprintGenerator(tree, optionsWithNestedPath);
      if (process.platform === 'linux' || process.platform === 'darwin') {
        expect(mockedFork).toHaveBeenCalledWith(
          expect.stringContaining('go-blueprint'),
          [
            'create',
            '--name',
            'test-app',
            '--framework',
            'gin',
            '--driver',
            'postgres',
            '--git',
            'skip',
          ],
          expect.objectContaining({
            cwd: expect.any(String),
          })
        );
      } else {
        expect(mockedSpawn).toHaveBeenCalledWith(
          'node',
          [
            expect.stringContaining('go-blueprint'),
            'create',
            '--name',
            'test-app',
            '--framework',
            'gin',
            '--driver',
            'postgres',
            '--git',
            'skip',
          ],
          expect.objectContaining({
            cwd: expect.any(String),
            stdio: 'inherit',
            shell: false,
            windowsVerbatimArguments: false,
          })
        );
      }
    });

    it('should handle process failure correctly', async () => {
      const mockProcess = createMockChildProcess();
      mockedFork.mockReturnValue(mockProcess);
      mockedSpawn.mockReturnValue(mockProcess);

      // Simulate process failure
      setTimeout(() => {
        mockProcess.emit('close', 1);
      }, 0);

      await expect(goBlueprintGenerator(tree, options)).rejects.toThrow(
        'go-blueprint execution failed with exit code 1'
      );
    });
  });
});
