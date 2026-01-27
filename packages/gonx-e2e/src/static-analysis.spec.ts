import {
  uniq,
  tmpProjPath,
  runNxCommand,
  ensureNxProject,
  cleanup,
  readJson,
  updateFile,
} from '@nx/plugin/testing';
import { join } from 'path';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';

describe('Static Analysis Dependency Detection', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support
    runNxCommand('generate @naxodev/gonx:init');
  });

  afterEach(() => cleanup());

  describe('with static-analysis strategy', () => {
    beforeEach(() => {
      // Update nx.json to use static-analysis strategy
      updateFile('nx.json', (content) => {
        const nxJson = JSON.parse(content);

        // Find the gonx plugin and update its options
        const pluginIndex = nxJson.plugins?.findIndex(
          (p: string | { plugin: string }) =>
            typeof p === 'string'
              ? p === '@naxodev/gonx'
              : p.plugin === '@naxodev/gonx'
        );

        if (pluginIndex !== -1 && pluginIndex !== undefined) {
          const plugin = nxJson.plugins[pluginIndex];
          if (typeof plugin === 'string') {
            nxJson.plugins[pluginIndex] = {
              plugin: '@naxodev/gonx',
              options: {
                dependencyStrategy: 'static-analysis',
              },
            };
          } else {
            plugin.options = {
              ...plugin.options,
              dependencyStrategy: 'static-analysis',
            };
          }
        }

        return JSON.stringify(nxJson, null, 2);
      });
    });

    it('should detect dependencies between Go projects using static analysis', async () => {
      const goapp = uniq('goapp');
      const golib = uniq('golib');

      // Generate a library first
      runNxCommand(`generate @naxodev/gonx:library ${golib}`, {
        env: { NX_ADD_PLUGINS: 'true' },
      });

      // Generate an application
      runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
        env: { NX_ADD_PLUGINS: 'true' },
      });

      // Get the library's module path from go.mod
      const libGoModPath = join(tmpProjPath(), golib, 'go.mod');
      const libGoModContent = readFileSync(libGoModPath, 'utf-8');
      const moduleMatch = libGoModContent.match(/module\s+(\S+)/);
      const libModulePath = moduleMatch
        ? moduleMatch[1]
        : `example.com/${golib}`;

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
      runNxCommand('reset');

      // Run nx graph to generate the project graph JSON
      const graphOutput = runNxCommand('graph --file=graph.json');

      // Read the generated graph file
      const graphJson = readJson('graph.json');

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
      runNxCommand(`generate @naxodev/gonx:library ${golib1}`, {
        env: { NX_ADD_PLUGINS: 'true' },
      });
      runNxCommand(`generate @naxodev/gonx:library ${golib2}`, {
        env: { NX_ADD_PLUGINS: 'true' },
      });

      // Generate an application
      runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
        env: { NX_ADD_PLUGINS: 'true' },
      });

      // Get module paths
      const lib1GoModContent = readFileSync(
        join(tmpProjPath(), golib1, 'go.mod'),
        'utf-8'
      );
      const lib1ModulePath =
        lib1GoModContent.match(/module\s+(\S+)/)?.[1] ||
        `example.com/${golib1}`;

      const lib2GoModContent = readFileSync(
        join(tmpProjPath(), golib2, 'go.mod'),
        'utf-8'
      );
      const lib2ModulePath =
        lib2GoModContent.match(/module\s+(\S+)/)?.[1] ||
        `example.com/${golib2}`;

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
      runNxCommand('reset');

      // Generate and check the graph
      runNxCommand('graph --file=graph.json');
      const graphJson = readJson('graph.json');

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

  describe('with auto strategy', () => {
    beforeEach(() => {
      // Update nx.json to use auto strategy
      updateFile('nx.json', (content) => {
        const nxJson = JSON.parse(content);

        const pluginIndex = nxJson.plugins?.findIndex(
          (p: string | { plugin: string }) =>
            typeof p === 'string'
              ? p === '@naxodev/gonx'
              : p.plugin === '@naxodev/gonx'
        );

        if (pluginIndex !== -1 && pluginIndex !== undefined) {
          const plugin = nxJson.plugins[pluginIndex];
          if (typeof plugin === 'string') {
            nxJson.plugins[pluginIndex] = {
              plugin: '@naxodev/gonx',
              options: {
                dependencyStrategy: 'auto',
              },
            };
          } else {
            plugin.options = {
              ...plugin.options,
              dependencyStrategy: 'auto',
            };
          }
        }

        return JSON.stringify(nxJson, null, 2);
      });
    });

    it('should still detect dependencies with auto strategy (Go is available)', async () => {
      const goapp = uniq('goapp');
      const golib = uniq('golib');

      // Generate a library and application
      runNxCommand(`generate @naxodev/gonx:library ${golib}`, {
        env: { NX_ADD_PLUGINS: 'true' },
      });
      runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
        env: { NX_ADD_PLUGINS: 'true' },
      });

      // Get the library's module path
      const libGoModPath = join(tmpProjPath(), golib, 'go.mod');
      const libGoModContent = readFileSync(libGoModPath, 'utf-8');
      const libModulePath =
        libGoModContent.match(/module\s+(\S+)/)?.[1] || `example.com/${golib}`;

      // Update the app to import the library
      const mainGoPath = join(tmpProjPath(), goapp, 'main.go');
      writeFileSync(
        mainGoPath,
        `package main

import (
  "fmt"
  "${libModulePath}"
)

func main() {
  fmt.Println(${golib}.Hello())
}
`
      );

      // Add replace directive
      const appGoModPath = join(tmpProjPath(), goapp, 'go.mod');
      const appGoModContent = readFileSync(appGoModPath, 'utf-8');
      writeFileSync(
        appGoModPath,
        `${appGoModContent}
replace ${libModulePath} => ../${golib}
`
      );

      runNxCommand('reset');
      runNxCommand('graph --file=graph.json');
      const graphJson = readJson('graph.json');

      const appDeps = graphJson.graph?.dependencies?.[goapp] || [];
      const hasDependencyOnLib = appDeps.some(
        (dep: { target: string }) => dep.target === golib
      );

      expect(hasDependencyOnLib).toBe(true);
    }, 120_000);
  });
});
