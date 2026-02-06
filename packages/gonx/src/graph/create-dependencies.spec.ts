/**
 * Tests for create-dependencies strategy selection.
 *
 * Note: These tests focus on the strategy selection logic.
 * The actual dependency detection is tested in the static-analysis tests
 * and via E2E tests for the full integration.
 */

// Mock all external dependencies before any imports
jest.mock('child_process');
jest.mock('./static-analysis');
jest.mock('./utils/compute-go-modules');
jest.mock('./utils/extract-project-root-map');
jest.mock('./utils/get-file-module-imports');
jest.mock('./utils/get-project-name-for-go-imports');

import { DependencyType } from '@nx/devkit';
import { createDependencies } from './create-dependencies';
import { execSync } from 'child_process';
import { createStaticAnalysisDependencies } from './static-analysis';
import { computeGoModules } from './utils/compute-go-modules';
import { getFileModuleImports } from './utils/get-file-module-imports';

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockStaticAnalysis =
  createStaticAnalysisDependencies as jest.MockedFunction<
    typeof createStaticAnalysisDependencies
  >;
const mockComputeGoModules = computeGoModules as jest.MockedFunction<
  typeof computeGoModules
>;
const mockGetFileModuleImports = getFileModuleImports as jest.MockedFunction<
  typeof getFileModuleImports
>;

describe('createDependencies', () => {
  // Minimal context for testing strategy selection
  const baseContext = {
    projects: {},
    filesToProcess: {
      projectFileMap: {},
      nonProjectFiles: [],
    },
    nxJsonConfiguration: {},
    workspaceRoot: '/workspace',
    fileMap: {
      projectFileMap: {},
      nonProjectFiles: [],
    },
    externalNodes: {},
  } as Parameters<typeof createDependencies>[1];

  const contextWithGoFiles = {
    ...baseContext,
    filesToProcess: {
      projectFileMap: {
        myapp: [{ file: 'myapp/main.go', hash: 'abc123' }],
      },
      nonProjectFiles: [],
    },
  } as Parameters<typeof createDependencies>[1];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockStaticAnalysis.mockResolvedValue([
      {
        type: DependencyType.static,
        source: 'app',
        target: 'lib',
        sourceFile: 'app/main.go',
      },
    ]);
    mockComputeGoModules.mockReturnValue([]);
    mockGetFileModuleImports.mockReturnValue([]);
  });

  describe('skipGoDependencyCheck option', () => {
    it('should return empty array when skipGoDependencyCheck is true', async () => {
      const result = await createDependencies(
        { skipGoDependencyCheck: true },
        baseContext
      );

      expect(result).toEqual([]);
      expect(mockStaticAnalysis).not.toHaveBeenCalled();
      expect(mockComputeGoModules).not.toHaveBeenCalled();
    });
  });

  describe('static-analysis strategy', () => {
    it('should use static analysis when strategy is static-analysis', async () => {
      const result = await createDependencies(
        { dependencyStrategy: 'static-analysis' },
        baseContext
      );

      expect(mockStaticAnalysis).toHaveBeenCalledWith(
        { dependencyStrategy: 'static-analysis' },
        baseContext
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('auto strategy', () => {
    it('should use static analysis when Go is not available', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('go: command not found');
      });

      const result = await createDependencies(
        { dependencyStrategy: 'auto' },
        baseContext
      );

      expect(mockStaticAnalysis).toHaveBeenCalled();
      expect(mockComputeGoModules).not.toHaveBeenCalled();
    });

    it('should fall back to static analysis when go-runtime fails', async () => {
      // Go is available
      mockExecSync.mockReturnValue(Buffer.from('go version go1.21.0'));

      // But go-runtime throws (e.g., missing go.work)
      mockComputeGoModules.mockImplementation(() => {
        throw new Error('go list -m -json: no go.work file found');
      });

      const result = await createDependencies(
        { dependencyStrategy: 'auto' },
        contextWithGoFiles
      );

      // Should have attempted go-runtime first
      expect(mockComputeGoModules).toHaveBeenCalled();
      // Then fallen back to static analysis
      expect(mockStaticAnalysis).toHaveBeenCalled();
    });

    it('should use go-runtime when Go is available and succeeds', async () => {
      // Go is available
      mockExecSync.mockReturnValue(Buffer.from('go version go1.21.0'));

      // go-runtime succeeds
      mockComputeGoModules.mockReturnValue([]);

      const result = await createDependencies(
        { dependencyStrategy: 'auto' },
        contextWithGoFiles
      );

      expect(mockComputeGoModules).toHaveBeenCalled();
      expect(mockStaticAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('go-runtime strategy (default)', () => {
    it('should use go-runtime by default', async () => {
      mockExecSync.mockReturnValue(Buffer.from('go version go1.21.0'));
      mockComputeGoModules.mockReturnValue([]);

      await createDependencies(undefined, contextWithGoFiles);

      expect(mockStaticAnalysis).not.toHaveBeenCalled();
      expect(mockComputeGoModules).toHaveBeenCalled();
    });

    it('should use go-runtime when strategy is explicitly go-runtime', async () => {
      mockExecSync.mockReturnValue(Buffer.from('go version go1.21.0'));
      mockComputeGoModules.mockReturnValue([]);

      await createDependencies(
        { dependencyStrategy: 'go-runtime' },
        contextWithGoFiles
      );

      expect(mockStaticAnalysis).not.toHaveBeenCalled();
      expect(mockComputeGoModules).toHaveBeenCalled();
    });
  });
});
