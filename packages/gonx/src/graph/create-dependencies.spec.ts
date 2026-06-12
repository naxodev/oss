// Explicit factory (not auto-mock) so bun does not load the real
// `./static-analysis` module — that module statically imports `p-limit`
// (ESM-only), and the module loader would resolve the require at module-load
// time before any per-test mock could intercept it.
import { describe, it, expect, beforeEach, mock, type Mock } from 'bun:test';

mock.module('./static-analysis', () => ({
  createStaticAnalysisDependencies: mock(),
}));

import { DependencyType } from '@nx/devkit';
import { createDependencies } from './create-dependencies';
import { createStaticAnalysisDependencies } from './static-analysis';

const mockStaticAnalysis = createStaticAnalysisDependencies as unknown as Mock<
  typeof createStaticAnalysisDependencies
>;

describe('createDependencies', () => {
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

  beforeEach(() => {
    mockStaticAnalysis.mockClear();

    mockStaticAnalysis.mockResolvedValue([
      {
        type: DependencyType.static,
        source: 'app',
        target: 'lib',
        sourceFile: 'app/main.go',
      },
    ]);
  });

  it('should return empty array when skipGoDependencyCheck is true', async () => {
    const result = await createDependencies(
      { skipGoDependencyCheck: true },
      baseContext
    );

    expect(result).toEqual([]);
    expect(mockStaticAnalysis).not.toHaveBeenCalled();
  });

  it('should delegate to static analysis', async () => {
    const result = await createDependencies(undefined, baseContext);

    expect(mockStaticAnalysis).toHaveBeenCalledWith(undefined, baseContext);
    expect(result).toHaveLength(1);
  });

  it('should pass options through to static analysis', async () => {
    const options = { skipGoDependencyCheck: false };

    await createDependencies(options, baseContext);

    expect(mockStaticAnalysis).toHaveBeenCalledWith(options, baseContext);
  });
});
