import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { fork } from 'child_process';
import { EventEmitter } from 'events';

import { goBlueprintGenerator } from './go-blueprint';
import { GoBlueprintGeneratorSchema } from './schema';

// Mock what we need
jest.mock('child_process');
jest.mock('../init/generator', () => ({
  initGenerator: jest.fn().mockResolvedValue(() => Promise.resolve()),
}));

// Mock require.resolve to return a fake binary path
const mockRequireResolve = jest.fn();

// Mock generateFiles specifically to avoid filesystem dependencies in tests
const mockedGenerateFiles = jest.fn();
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  generateFiles: (...args: any[]) => mockedGenerateFiles(...args),
}));

const mockedFork = fork as jest.MockedFunction<typeof fork>;

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
    jest.clearAllMocks();

    // Mock require.resolve to return a fake binary path
    mockRequireResolve.mockReturnValue('/fake/path/to/go-blueprint');
    (global as any).require = {
      ...require,
      resolve: mockRequireResolve,
    };

    // Mock successful fork by default
    const mockProcess = createMockChildProcess();
    mockedFork.mockReturnValue(mockProcess);

    // Simulate successful process completion
    setTimeout(() => {
      mockProcess.emit('close', 0);
    }, 0);
  });

  it('should complete successfully with default options', async () => {
    await goBlueprintGenerator(tree, options);

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
  });

  describe('command building', () => {
    it('should successfully generate with advanced features', async () => {
      const optionsWithFeatures = {
        ...options,
        feature: ['htmx', 'docker'],
      };

      await goBlueprintGenerator(tree, optionsWithFeatures);

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
    });

    it('should handle directory structure correctly', async () => {
      const optionsWithNestedPath = {
        ...options,
        directory: 'apps/backend/test-app',
      };

      await goBlueprintGenerator(tree, optionsWithNestedPath);

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
    });

    it('should handle process failure correctly', async () => {
      const mockProcess = createMockChildProcess();
      mockedFork.mockReturnValue(mockProcess);

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
