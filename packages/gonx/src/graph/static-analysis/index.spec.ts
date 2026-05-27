/**
 * Integration-style tests for `createStaticAnalysisDependencies`.
 *
 * Earlier revisions mocked every collaborator (`buildImportMap`,
 * `extractImports`, `findGoFiles`, `resolveImport`) plus a passthrough
 * `p-limit`, which reduced the orchestrator to identity assertions —
 * the tests could not have caught a real path-join bug, a real dedupe
 * collision, or a real concurrency issue. We now drive most cases
 * against a real per-test tmpdir with real go.mod and .go files, going
 * through the real parser. Only `p-limit` stays mocked (ts-jest
 * compiles a static `import` to `require` which can't parse p-limit's
 * ESM source); and a single `Windows path` regression test below
 * selectively mocks `findGoFiles` because we cannot author backslash-
 * shaped paths the filesystem can actually read on POSIX hosts.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

jest.mock('p-limit', () => ({
  __esModule: true,
  default:
    () =>
    <T>(fn: () => T) =>
      fn(),
}));

// `workspaceRoot` is captured per-use via this getter so each test can
// point the orchestrator at a fresh tmpdir without re-importing modules.
let currentWorkspaceRoot = '';
jest.mock('@nx/devkit', () => {
  const actual = jest.requireActual('@nx/devkit');
  return {
    ...actual,
    get workspaceRoot() {
      return currentWorkspaceRoot;
    },
  };
});

import { CreateDependenciesContext, DependencyType } from '@nx/devkit';
import { createStaticAnalysisDependencies } from './index';

/**
 * Write a file inside the workspace, creating intermediate directories.
 */
function writeFile(root: string, rel: string, content: string): void {
  const fullPath = join(root, rel);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content);
}

/**
 * Build a minimal `CreateDependenciesContext` for tests.
 */
function makeContext(
  workspaceRoot: string,
  overrides: Partial<CreateDependenciesContext> = {}
): CreateDependenciesContext {
  return {
    projects: {},
    filesToProcess: {
      projectFileMap: {},
      nonProjectFiles: [],
    },
    nxJsonConfiguration: {},
    workspaceRoot,
    fileMap: {
      projectFileMap: {},
      nonProjectFiles: [],
    },
    externalNodes: {},
    ...overrides,
  } as CreateDependenciesContext;
}

describe('createStaticAnalysisDependencies', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'gonx-static-analysis-'));
    currentWorkspaceRoot = workspaceRoot;
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('returns empty when no project has a go.mod', async () => {
    // No go.mod anywhere → buildImportMap returns an empty base map and
    // the orchestrator short-circuits before scanning files.
    const context = makeContext(workspaceRoot, {
      projects: { app: { root: 'app' } as any },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([]);
  });

  it('detects a static dependency through a replace directive', async () => {
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'lib/lib.go',
      'package lib\n\nfunc Hello() string { return "hi" }\n'
    );
    writeFile(
      workspaceRoot,
      'app/go.mod',
      `module github.com/myorg/app

go 1.21

require github.com/myorg/lib v0.0.0

replace github.com/myorg/lib => ../lib
`
    );
    writeFile(
      workspaceRoot,
      'app/main.go',
      `package main

import (
  "fmt"
  "github.com/myorg/lib"
)

func main() { fmt.Println(lib.Hello()) }
`
    );

    const context = makeContext(workspaceRoot, {
      projects: {
        app: { root: 'app' } as any,
        lib: { root: 'lib' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/main.go', hash: 'h' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([
      {
        type: DependencyType.static,
        source: 'app',
        target: 'lib',
        sourceFile: 'app/main.go',
      },
    ]);
  });

  it('resolves a dependency via module-path match without a replace directive', async () => {
    // No replace directive — the module path itself is what matches the
    // library's go.mod. (Go itself would need go.work/replace to BUILD
    // this, but the dependency graph can still be detected statically.)
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(workspaceRoot, 'lib/lib.go', 'package lib\n');
    writeFile(
      workspaceRoot,
      'app/go.mod',
      'module github.com/myorg/app\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'app/main.go',
      `package main

import "github.com/myorg/lib"

func _() { _ = lib.X }
`
    );

    const context = makeContext(workspaceRoot, {
      projects: {
        app: { root: 'app' } as any,
        lib: { root: 'lib' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/main.go', hash: 'h' }],
        },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([
      {
        type: DependencyType.static,
        source: 'app',
        target: 'lib',
        sourceFile: 'app/main.go',
      },
    ]);
  });

  it('produces no edges when imports only target stdlib and external modules', async () => {
    // Negative-space: a file that imports only fmt + a non-workspace
    // package must NOT create a spurious dependency edge.
    writeFile(
      workspaceRoot,
      'app/go.mod',
      'module github.com/myorg/app\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'app/main.go',
      `package main

import (
  "fmt"
  "github.com/external/pkg"
)

func main() { fmt.Println(pkg.X) }
`
    );

    const context = makeContext(workspaceRoot, {
      projects: { app: { root: 'app' } as any },
      filesToProcess: {
        projectFileMap: { app: [{ file: 'app/main.go', hash: 'h' }] },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([]);
  });

  it('falls back to findGoFiles when context has no .go files for the project', async () => {
    // The project is "affected" because its go.mod changed, but
    // filesToProcess lists no .go files. The orchestrator must scan
    // the project root for .go files and process them.
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(workspaceRoot, 'lib/lib.go', 'package lib\n');
    writeFile(
      workspaceRoot,
      'app/go.mod',
      'module github.com/myorg/app\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'app/main.go',
      `package main

import "github.com/myorg/lib"

func main() {}
`
    );

    const context = makeContext(workspaceRoot, {
      projects: {
        app: { root: 'app' } as any,
        lib: { root: 'lib' } as any,
      },
      filesToProcess: {
        projectFileMap: { app: [{ file: 'app/go.mod', hash: 'h' }] },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([
      {
        type: DependencyType.static,
        source: 'app',
        target: 'lib',
        sourceFile: 'app/main.go',
      },
    ]);
  });

  it('skips projects missing from context.projects', async () => {
    // A `ghost` project appears in `filesToProcess` but not `projects`.
    // The orchestrator must silently skip it.
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(workspaceRoot, 'lib/lib.go', 'package lib\n');

    const context = makeContext(workspaceRoot, {
      projects: { lib: { root: 'lib' } as any },
      filesToProcess: {
        projectFileMap: { ghost: [{ file: 'ghost/main.go', hash: 'h' }] },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([]);
  });

  it('deduplicates edges when multiple imports in one file resolve to the same target', async () => {
    // Two imports in the same file (`lib` and `lib/sub`) both land on
    // the `lib` project. The dedup key is `source:target:sourceFile`,
    // so only one edge survives.
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(workspaceRoot, 'lib/lib.go', 'package lib\n');
    writeFile(workspaceRoot, 'lib/sub/sub.go', 'package sub\n');
    writeFile(
      workspaceRoot,
      'app/go.mod',
      'module github.com/myorg/app\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'app/main.go',
      `package main

import (
  "github.com/myorg/lib"
  "github.com/myorg/lib/sub"
)

func main() { _ = lib.X; _ = sub.X }
`
    );

    const context = makeContext(workspaceRoot, {
      projects: {
        app: { root: 'app' } as any,
        lib: { root: 'lib' } as any,
      },
      filesToProcess: {
        projectFileMap: { app: [{ file: 'app/main.go', hash: 'h' }] },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([
      {
        type: DependencyType.static,
        source: 'app',
        target: 'lib',
        sourceFile: 'app/main.go',
      },
    ]);
  });

  it('keeps separate edges when two files in the same project target the same dep', async () => {
    // Same source -> target, but different sourceFile → both kept.
    // Pins the comment on `deduplicateDependencies`: "Preserves per-file
    // tracking for incremental updates when files change."
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(workspaceRoot, 'lib/lib.go', 'package lib\n');
    writeFile(
      workspaceRoot,
      'app/go.mod',
      'module github.com/myorg/app\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'app/a.go',
      'package main\nimport "github.com/myorg/lib"\nfunc A() { _ = lib.X }\n'
    );
    writeFile(
      workspaceRoot,
      'app/b.go',
      'package main\nimport "github.com/myorg/lib"\nfunc B() { _ = lib.X }\n'
    );

    const context = makeContext(workspaceRoot, {
      projects: {
        app: { root: 'app' } as any,
        lib: { root: 'lib' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [
            { file: 'app/a.go', hash: 'a' },
            { file: 'app/b.go', hash: 'b' },
          ],
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
      sourceFile: 'app/a.go',
    });
    expect(result).toContainEqual({
      type: DependencyType.static,
      source: 'app',
      target: 'lib',
      sourceFile: 'app/b.go',
    });
  });

  it('processes multiple source projects in one run', async () => {
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(workspaceRoot, 'lib/lib.go', 'package lib\n');
    writeFile(
      workspaceRoot,
      'app/go.mod',
      'module github.com/myorg/app\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'app/main.go',
      'package main\nimport "github.com/myorg/lib"\nfunc main() { _ = lib.X }\n'
    );
    writeFile(
      workspaceRoot,
      'svc/go.mod',
      'module github.com/myorg/svc\n\ngo 1.21\n'
    );
    writeFile(
      workspaceRoot,
      'svc/main.go',
      'package main\nimport "github.com/myorg/lib"\nfunc main() { _ = lib.X }\n'
    );

    const context = makeContext(workspaceRoot, {
      projects: {
        app: { root: 'app' } as any,
        svc: { root: 'svc' } as any,
        lib: { root: 'lib' } as any,
      },
      filesToProcess: {
        projectFileMap: {
          app: [{ file: 'app/main.go', hash: 'h' }],
          svc: [{ file: 'svc/main.go', hash: 'h' }],
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
      target: 'lib',
      sourceFile: 'svc/main.go',
    });
  });

  it('does not produce a self-referential edge', async () => {
    // A file inside `lib` importing its own module path (e.g. via a
    // sub-package) must not produce a `lib -> lib` edge.
    writeFile(
      workspaceRoot,
      'lib/go.mod',
      'module github.com/myorg/lib\n\ngo 1.21\n'
    );
    writeFile(workspaceRoot, 'lib/sub/sub.go', 'package sub\n');
    writeFile(
      workspaceRoot,
      'lib/lib.go',
      'package lib\nimport "github.com/myorg/lib/sub"\nfunc Use() { _ = sub.X }\n'
    );

    const context = makeContext(workspaceRoot, {
      projects: { lib: { root: 'lib' } as any },
      filesToProcess: {
        projectFileMap: { lib: [{ file: 'lib/lib.go', hash: 'h' }] },
        nonProjectFiles: [],
      },
    });

    const result = await createStaticAnalysisDependencies(undefined, context);

    expect(result).toEqual([]);
  });

  // Windows-path regression — kept in its own describe because we have to
  // mock the filesystem-facing collaborator to simulate backslash paths
  // we cannot actually read on POSIX hosts.
  describe('sourceFile normalization', () => {
    // Re-import in a scope where the collaborator is mockable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const findGoFilesModule = require('./find-go-files');
    const findGoFilesSpy = jest.spyOn(findGoFilesModule, 'findGoFiles');

    afterEach(() => {
      findGoFilesSpy.mockReset();
    });

    afterAll(() => {
      findGoFilesSpy.mockRestore();
    });

    it('normalizes sourceFile to forward slashes for Windows-shaped paths', async () => {
      // Nx looks up `sourceFile` by string equality against
      // `projectFileMap`, which uses forward slashes regardless of host
      // OS. The `normalizePath` call in `index.ts` is what guarantees
      // forward slashes — without it, a backslash path on Windows would
      // silently mismatch and the edge would be dropped.
      writeFile(
        workspaceRoot,
        'lib/go.mod',
        'module github.com/myorg/lib\n\ngo 1.21\n'
      );
      writeFile(workspaceRoot, 'lib/lib.go', 'package lib\n');
      writeFile(
        workspaceRoot,
        'app/go.mod',
        'module github.com/myorg/app\n\ngo 1.21\n'
      );

      // We don't write a real app/main.go because we'll mock findGoFiles
      // to return a backslash-shaped path that no real fs can read.
      // Instead, intercept the extractImports call too via a single
      // jest.spyOn so the file content is supplied synthetically.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const extractImportsModule = require('./extract-imports');
      const extractSpy = jest
        .spyOn(extractImportsModule, 'extractImports')
        .mockResolvedValue(['github.com/myorg/lib']);

      const backslashPath = `${workspaceRoot}\\app\\main.go`;
      findGoFilesSpy.mockResolvedValue([backslashPath]);

      try {
        const context = makeContext(workspaceRoot, {
          projects: {
            app: { root: 'app' } as any,
            lib: { root: 'lib' } as any,
          },
          filesToProcess: {
            projectFileMap: { app: [] },
            nonProjectFiles: [],
          },
        });

        const result = await createStaticAnalysisDependencies(
          undefined,
          context
        );

        expect(result).toHaveLength(1);
        const dep = result[0];
        if (dep.type !== DependencyType.static) {
          throw new Error(`expected a static dependency, got ${dep.type}`);
        }
        expect(dep.sourceFile).toBe('app/main.go');
        expect(dep.sourceFile).not.toMatch(/\\/);
      } finally {
        extractSpy.mockRestore();
      }
    });
  });
});
