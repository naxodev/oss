import { uniq, tmpProjPath, readJson } from '@nx/plugin/testing';
import { createTestProject, cleanup, runCLI } from '@naxodev/e2e-utils';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

describe('Dependency Detection', () => {
  beforeAll(() => {
    // Create a real Nx workspace and install @naxodev/gonx from the local
    // registry — exercises the published-tarball install path (peerDeps,
    // exports) that the legacy ensureNxProject fixture never touched.
    createTestProject('gonx');

    // Initialize Go support
    runCLI('generate @naxodev/gonx:init');
  }, 300_000);

  afterAll(() => cleanup());

  it('should detect dependencies between Go projects', async () => {
    const goapp = uniq('goapp');
    const golib = uniq('golib');

    // Generate a library first
    runCLI(`generate @naxodev/gonx:library ${golib}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Generate an application
    runCLI(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Get the library's module path from go.mod
    const libGoModPath = join(tmpProjPath(), golib, 'go.mod');
    const libGoModContent = readFileSync(libGoModPath, 'utf-8');
    const moduleMatch = libGoModContent.match(/module\s+(\S+)/);
    const libModulePath = moduleMatch ? moduleMatch[1] : `example.com/${golib}`;

    // Update the application to import the library
    const mainGoPath = join(tmpProjPath(), goapp, 'main.go');
    writeFileSync(
      mainGoPath,
      `package main

import (
  "fmt"
  "${libModulePath}"
)

func main() {
  fmt.Println("Hello from ${goapp}")
  fmt.Println(${golib}.Hello())
}
`
    );

    // Add a replace directive to the app's go.mod to point to the library
    const appGoModPath = join(tmpProjPath(), goapp, 'go.mod');
    const appGoModContent = readFileSync(appGoModPath, 'utf-8');
    writeFileSync(
      appGoModPath,
      `${appGoModContent}
replace ${libModulePath} => ../${golib}
`
    );

    // Reset Nx to pick up the changes
    runCLI('reset');

    // Per-test graph file: the workspace is shared across tests (beforeAll), so
    // a fixed name could let one test read a stale graph written by another.
    const graphFile = `graph-${goapp}.json`;
    runCLI(`graph --file=${graphFile}`);

    // Read the generated graph file
    const graphJson = readJson(graphFile);

    // Verify that the dependency was detected
    const appDeps = graphJson.graph?.dependencies?.[goapp] || [];
    const hasDependencyOnLib = appDeps.some(
      (dep: { target: string }) => dep.target === golib
    );

    expect(hasDependencyOnLib).toBe(true);
  }, 120_000);

  it('should detect dependencies in multi-project workspace', async () => {
    const goapp = uniq('goapp');
    const golib1 = uniq('golib1');
    const golib2 = uniq('golib2');

    // Generate two libraries
    runCLI(`generate @naxodev/gonx:library ${golib1}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });
    runCLI(`generate @naxodev/gonx:library ${golib2}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Generate an application
    runCLI(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Get module paths
    const lib1GoModContent = readFileSync(
      join(tmpProjPath(), golib1, 'go.mod'),
      'utf-8'
    );
    const lib1ModulePath =
      lib1GoModContent.match(/module\s+(\S+)/)?.[1] || `example.com/${golib1}`;

    const lib2GoModContent = readFileSync(
      join(tmpProjPath(), golib2, 'go.mod'),
      'utf-8'
    );
    const lib2ModulePath =
      lib2GoModContent.match(/module\s+(\S+)/)?.[1] || `example.com/${golib2}`;

    // Update lib1 to import lib2
    const lib1MainPath = join(tmpProjPath(), golib1, `${golib1}.go`);
    writeFileSync(
      lib1MainPath,
      `package ${golib1}

import (
  "${lib2ModulePath}"
)

func Hello() string {
  return "Hello from ${golib1}: " + ${golib2}.Hello()
}
`
    );

    // Add replace directive to lib1's go.mod
    const lib1GoModPath = join(tmpProjPath(), golib1, 'go.mod');
    writeFileSync(
      lib1GoModPath,
      `${lib1GoModContent}
replace ${lib2ModulePath} => ../${golib2}
`
    );

    // Update app to import lib1
    const mainGoPath = join(tmpProjPath(), goapp, 'main.go');
    writeFileSync(
      mainGoPath,
      `package main

import (
  "fmt"
  "${lib1ModulePath}"
)

func main() {
  fmt.Println(${golib1}.Hello())
}
`
    );

    // Add replace directive to app's go.mod
    const appGoModPath = join(tmpProjPath(), goapp, 'go.mod');
    const appGoModContent = readFileSync(appGoModPath, 'utf-8');
    writeFileSync(
      appGoModPath,
      `${appGoModContent}
replace ${lib1ModulePath} => ../${golib1}
`
    );

    // Reset Nx
    runCLI('reset');

    // Generate and check the graph (per-test file; see note above).
    const graphFile = `graph-${goapp}.json`;
    runCLI(`graph --file=${graphFile}`);
    const graphJson = readJson(graphFile);

    // Check app -> lib1 dependency
    const appDeps = graphJson.graph?.dependencies?.[goapp] || [];
    const appDependsOnLib1 = appDeps.some(
      (dep: { target: string }) => dep.target === golib1
    );
    expect(appDependsOnLib1).toBe(true);

    // Check lib1 -> lib2 dependency
    const lib1Deps = graphJson.graph?.dependencies?.[golib1] || [];
    const lib1DependsOnLib2 = lib1Deps.some(
      (dep: { target: string }) => dep.target === golib2
    );
    expect(lib1DependsOnLib2).toBe(true);
  }, 180_000);
});
