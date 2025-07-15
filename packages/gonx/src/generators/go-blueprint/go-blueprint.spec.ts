import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, generateFiles } from '@nx/devkit';
import { execSync } from 'child_process';

import { goBlueprintGenerator } from './go-blueprint';
import { GoBlueprintGeneratorSchema } from './schema';

// Mock what we need
jest.mock('child_process');
jest.mock('../init/generator', () => ({
  initGenerator: jest.fn().mockResolvedValue(() => Promise.resolve()),
}));

// Mock generateFiles specifically to avoid filesystem dependencies in tests
const mockedGenerateFiles = jest.fn();
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  generateFiles: (...args: any[]) => mockedGenerateFiles(...args),
}));

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('go-blueprint generator', () => {
  let tree: Tree;
  const options: GoBlueprintGeneratorSchema = {
    directory: 'test-app',
    driver: 'postgres',
    framework: 'gin',
    git: 'skip',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();

    // Mock successful execSync by default
    mockedExecSync.mockReturnValue(Buffer.from('success'));
  });

  it('should throw error when go-blueprint binary is not installed', async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    await expect(goBlueprintGenerator(tree, options)).rejects.toThrow(
      'go-blueprint binary not found'
    );
    expect(mockedExecSync).toHaveBeenCalledWith('go-blueprint version', {
      stdio: 'ignore',
    });
  });

  it('should validate go-blueprint binary and complete successfully', async () => {
    await goBlueprintGenerator(tree, options);

    expect(mockedExecSync).toHaveBeenCalledWith('go-blueprint version', {
      stdio: 'ignore',
    });
    // Verify execSync was called at least twice (validation + generation)
    expect(mockedExecSync).toHaveBeenCalledTimes(2);
  });

  describe('command building', () => {
    it('should successfully generate with required options', async () => {
      await goBlueprintGenerator(tree, options);

      expect(mockedExecSync).toHaveBeenCalledWith('go-blueprint version', {
        stdio: 'ignore',
      });
      // Verify the go-blueprint create command was called
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining('go-blueprint create'),
        expect.objectContaining({
          cwd: expect.any(String),
        })
      );
    });

    it('should successfully generate with advanced features', async () => {
      const optionsWithFeatures = {
        ...options,
        feature: ['htmx', 'docker'],
      };

      await goBlueprintGenerator(tree, optionsWithFeatures);

      expect(mockedExecSync).toHaveBeenCalledWith('go-blueprint version', {
        stdio: 'ignore',
      });
      // Verify advanced flag was used
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--advanced'),
        expect.any(Object)
      );
    });

    it('should handle directory structure correctly', async () => {
      const optionsWithNestedPath = {
        ...options,
        directory: 'apps/backend/test-app',
      };

      await goBlueprintGenerator(tree, optionsWithNestedPath);

      expect(mockedExecSync).toHaveBeenCalledTimes(2);
    });
  });
});
