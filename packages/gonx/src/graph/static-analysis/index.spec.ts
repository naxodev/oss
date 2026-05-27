jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  workspaceRoot: '/workspace',
}));
jest.mock('p-limit', () => ({
  __esModule: true,
  default:
    () =>
    <T>(fn: () => T) =>
      fn(),
}));
jest.mock('./build-import-map');
jest.mock('./extract-imports');
jest.mock('./find-go-files');
jest.mock('./resolve-import');

import { DependencyType, CreateDependenciesContext } from '@nx/devkit';
import { createStaticAnalysisDependencies } from './index';
import { buildImportMap } from './build-import-map';
import { extractImports } from './extract-imports';
import { findGoFiles } from './find-go-files';
import { resolveImport } from './resolve-import';

const mockBuildImportMap = buildImportMap as jest.MockedFunction<
  typeof buildImportMap
>;
const mockExtractImports = extractImports as jest.MockedFunction<
  typeof extractImports
>;
const mockFindGoFiles = findGoFiles as jest.MockedFunction<typeof findGoFiles>;
const mockResolveImport = resolveImport as jest.MockedFunction<
  typeof resolveImport
>;

function makeContext(
  overrides: Partial<CreateDependenciesContext> = {}
): CreateDependenciesContext {
  return {
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
    ...overrides,
  } as CreateDependenciesContext;
}

describe('createStaticAnalysisDependencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map(),
      projectReplaceDirectives: new Map(),
    });
    mockExtractImports.mockResolvedValue([]);
    mockFindGoFiles.mockResolvedValue([]);
    mockResolveImport.mockReturnValue(null);
  });

  it('should return empty array when no Go modules found', async () => {
    const result = await createStaticAnalysisDependencies(
      undefined,
      makeContext()
    );

    expect(result).toEqual([]);
    expect(mockExtractImports).not.toHaveBeenCalled();
  });

  it('should use Go files from context when available', async () => {
    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map([['github.com/myorg/lib', 'lib']]),
      projectReplaceDirectives: new Map(),
    });
    mockExtractImports.mockResolvedValue(['github.com/myorg/lib']);
    mockResolveImport.mockReturnValue('lib');

    const context = makeContext({
      projects: {
        app: { root: 'app' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/main.go', hash: 'abc' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(mockExtractImports).toHaveBeenCalledWith('/workspace/app/main.go');
    expect(mockFindGoFiles).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        type: DependencyType.static,
        source: 'app',
        target: 'lib',
        sourceFile: 'app/main.go',
      },
    ]);
  });

  it('should fall back to findGoFiles when context has no Go files', async () => {
    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map([['github.com/myorg/lib', 'lib']]),
      projectReplaceDirectives: new Map(),
    });
    mockFindGoFiles.mockResolvedValue(['/workspace/app/main.go']);
    mockExtractImports.mockResolvedValue(['github.com/myorg/lib']);
    mockResolveImport.mockReturnValue('lib');

    const context = makeContext({
      projects: {
        app: { root: 'app' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/go.mod', hash: 'abc' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(mockFindGoFiles).toHaveBeenCalledWith('/workspace/app');
    expect(result).toHaveLength(1);
  });

  it('should skip imports that do not resolve to a project', async () => {
    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map([['github.com/myorg/lib', 'lib']]),
      projectReplaceDirectives: new Map(),
    });
    mockExtractImports.mockResolvedValue(['fmt', 'github.com/external/pkg']);
    mockResolveImport.mockReturnValue(null);

    const context = makeContext({
      projects: {
        app: { root: 'app' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/main.go', hash: 'abc' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([]);
  });

  it('should skip projects missing from context.projects', async () => {
    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map([['github.com/myorg/lib', 'lib']]),
      projectReplaceDirectives: new Map(),
    });

    const context = makeContext({
      projects: {},
      filesToProcess: {
        projectFileMap: {
          ghost: [{ file: 'ghost/main.go', hash: 'abc' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(mockExtractImports).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should deduplicate dependencies with same source, target, and sourceFile', async () => {
    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map([['github.com/myorg/lib', 'lib']]),
      projectReplaceDirectives: new Map(),
    });
    // Two different imports that resolve to the same target project
    mockExtractImports.mockResolvedValue([
      'github.com/myorg/lib',
      'github.com/myorg/lib/sub',
    ]);
    mockResolveImport.mockReturnValue('lib');

    const context = makeContext({
      projects: {
        app: { root: 'app' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/main.go', hash: 'abc' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toHaveLength(1);
  });

  it('should process multiple projects and files', async () => {
    const replaceDirectives = new Map([
      ['app', new Map([['github.com/myorg/lib', '../lib']])],
    ]);
    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map([
        ['github.com/myorg/lib', 'lib'],
        ['github.com/myorg/utils', 'utils'],
      ]),
      projectReplaceDirectives: replaceDirectives,
    });
    mockExtractImports
      .mockResolvedValueOnce(['github.com/myorg/lib'])
      .mockResolvedValueOnce(['github.com/myorg/utils']);
    mockResolveImport.mockReturnValueOnce('lib').mockReturnValueOnce('utils');

    const context = makeContext({
      projects: {
        app: { root: 'app' } as any,
        svc: { root: 'svc' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/main.go', hash: 'a1' }],
          svc: [{ file: 'svc/main.go', hash: 's1' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      type: DependencyType.static,
      source: 'app',
      target: 'lib',
      sourceFile: 'app/main.go',
    });
    expect(result).toContainEqual({
      type: DependencyType.static,
      source: 'svc',
      target: 'utils',
      sourceFile: 'svc/main.go',
    });
  });

  // Nx looks up `sourceFile` against its `projectFileMap`, which uses forward
  // slashes regardless of host OS. On Windows, `path.join` produces backslash
  // paths and `filePath.slice(workspaceRoot.length + 1)` would yield e.g.
  // `app\main.go`, mismatching the projectFileMap key and dropping the edge.
  // The `normalizePath` call in `index.ts` is what guarantees forward slashes.
  it('should normalize sourceFile to forward slashes for Windows-style paths', async () => {
    mockBuildImportMap.mockResolvedValue({
      baseImportMap: new Map([['github.com/myorg/lib', 'lib']]),
      projectReplaceDirectives: new Map(),
    });
    mockExtractImports.mockResolvedValue(['github.com/myorg/lib']);
    mockResolveImport.mockReturnValue('lib');
    // Simulate findGoFiles returning a Windows-shaped backslash path under
    // the workspaceRoot. We don't actually run on Windows here — the test
    // pins the post-discovery normalization step regardless of host OS.
    mockFindGoFiles.mockResolvedValue(['/workspace\\app\\main.go']);

    const context = makeContext({
      projects: {
        app: { root: 'app' } as any,
      },
      filesToProcess: {
        projectFileMap: { app: [] },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toHaveLength(1);
    const dep = result[0];
    // Narrow the StaticDependency | ImplicitDependency union; only the
    // static variant carries `sourceFile`.
    if (dep.type !== DependencyType.static) {
      throw new Error(`expected a static dependency, got ${dep.type}`);
    }
    expect(dep.sourceFile).toBe('app/main.go');
    expect(dep.sourceFile).not.toMatch(/\\/);
  });
});
