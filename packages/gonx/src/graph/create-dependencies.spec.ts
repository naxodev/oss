jest.mock('./static-analysis');

import { DependencyType } from '@nx/devkit';
import { createDependencies } from './create-dependencies';
import { createStaticAnalysisDependencies } from './static-analysis';

const mockStaticAnalysis =
  createStaticAnalysisDependencies as jest.MockedFunction<
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
    jest.clearAllMocks();

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
