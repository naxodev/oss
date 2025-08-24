import * as devkit from '@nx/devkit';
import {
  getProjects,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { applicationGenerator } from './generator';

describe('app', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();

    jest.clearAllMocks();
  });

  describe('not nested', () => {
    it('should update project config', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
        port: 3001,
      });
      const project = readProjectConfiguration(tree, 'myWorkerApp');
      expect(project.root).toEqual('myWorkerApp');
      expect(project.targets).toEqual(
        expect.objectContaining({
          serve: {
            executor: '@naxodev/nx-cloudflare:serve',
            options: {
              port: 3001,
            },
          },

          deploy: {
            executor: '@naxodev/nx-cloudflare:deploy',
          },
        })
      );
      expect(project.targets.build).toBeUndefined();
    });

    it('should update tags', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
        tags: 'one,two',
      });
      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        myWorkerApp: {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
      });
      expect(tree.exists('myWorkerApp/src/index.ts')).toBeTruthy();
      expect(tree.exists('myWorkerApp/src/index.test.ts')).toBeTruthy();
      expect(
        tree.exists('myWorkerApp/src/index.integration.test.ts')
      ).toBeTruthy();

      const tsconfig = readJson(tree, 'myWorkerApp/tsconfig.json');
      expect(tsconfig).toMatchInlineSnapshot(`
        {
          "compilerOptions": {
            "esModuleInterop": true,
          },
          "extends": "../tsconfig.base.json",
          "files": [],
          "include": [],
          "references": [
            {
              "path": "./tsconfig.app.json",
            },
            {
              "path": "./tsconfig.spec.json",
            },
          ],
        }
      `);

      const tsconfigApp = readJson(tree, 'myWorkerApp/tsconfig.app.json');
      expect(tsconfigApp.compilerOptions.outDir).toEqual('../dist/out-tsc');
      expect(tsconfigApp.compilerOptions.target).toEqual('es2021');
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');
      expect(tsconfigApp.exclude).toEqual([
        'vite.config.ts',
        'vite.config.mts',
        'vitest.config.ts',
        'vitest.config.mts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.tsx',
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'src/**/*.test.jsx',
        'src/**/*.spec.jsx',
      ]);
      const eslintrc = readJson(tree, 'myWorkerApp/.eslintrc.json');
      expect(eslintrc).toMatchInlineSnapshot(`
        {
          "extends": [
            "../.eslintrc.json",
          ],
          "ignorePatterns": [
            "!**/*",
            "**/vite.config.*.timestamp*",
            "**/vitest.config.*.timestamp*",
          ],
          "overrides": [
            {
              "files": [
                "*.ts",
                "*.tsx",
                "*.js",
                "*.jsx",
              ],
              "rules": {},
            },
            {
              "files": [
                "*.ts",
                "*.tsx",
              ],
              "rules": {},
            },
            {
              "files": [
                "*.js",
                "*.jsx",
              ],
              "rules": {},
            },
          ],
        }
      `);
    });

    it('should generate files without directory parameter', async () => {
      // Test without specifying directory
      await applicationGenerator(tree, {
        directory: 'myApp',
      });
      expect(tree.exists('myApp/src/index.ts')).toBeTruthy();
      expect(tree.exists('myApp/src/index.test.ts')).toBeTruthy();
      expect(tree.exists('myApp/src/index.integration.test.ts')).toBeTruthy();

      const project = readProjectConfiguration(tree, 'myApp');
      expect(project.root).toEqual('myApp');
    });

    it('should not generate files when template is none', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
        template: 'none',
      });
      expect(tree.exists('myWorkerApp/src/index.ts')).toBeFalsy();
      expect(tree.exists('myWorkerApp/src/index.test.ts')).toBeFalsy();
      expect(
        tree.exists('myWorkerApp/src/index.integration.test.ts')
      ).toBeFalsy();
    });

    it('should not have test files if the unitTestRunner is none', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
        unitTestRunner: 'none',
      });
      expect(tree.exists(`myWorkerApp/src/index.test.ts`)).toBeFalsy();
      expect(
        tree.exists(`myWorkerApp/src/index.integration.test.ts`)
      ).toBeFalsy();
    });

    it('should extend from root tsconfig.json when no tsconfig.base.json', async () => {
      tree.rename('tsconfig.base.json', 'tsconfig.json');

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
      });

      const tsconfig = readJson(tree, 'myWorkerApp/tsconfig.json');
      expect(tsconfig.extends).toBe('../tsconfig.json');
    });

    it('should create the common configuration files', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
      });
      expect(tree.exists('myWorkerApp/.gitignore')).toBeTruthy();
      expect(tree.exists('myWorkerApp/package.json')).toBeTruthy();
      expect(tree.exists('myWorkerApp/vitest.config.ts')).toBeTruthy();
      expect(tree.read('myWorkerApp/wrangler.toml', 'utf-8'))
        .toMatchInlineSnapshot(`
        "name = "myWorkerApp"
        compatibility_date = "2024-01-01"
        compatibility_flags = ["nodejs_compat"]
        main = "src/index.ts"


        "
      `);
    });

    it('should generate a vitest config file to allow the poolOptions when vitest is the test runner', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
      });
      expect(tree.read('myWorkerApp/vitest.config.ts', 'utf-8'))
        .toMatchInlineSnapshot(`
        "import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

        export default defineWorkersConfig({
          test: {
            poolOptions: {
              workers: {
                wrangler: { configPath: './wrangler.toml' },
              },
            },
          },
        });
        "
      `);
    });
  });

  describe('nested', () => {
    it('should update project config', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myDir/myWorkerApp',
      });
      const project = readProjectConfiguration(tree, 'myWorkerApp');

      expect(project.root).toEqual('myDir/myWorkerApp');

      expect(() => readProjectConfiguration(tree, 'myWorkerApp-e2e')).toThrow(
        /Cannot find/
      );
    });

    it('should update tags', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myDir/myWorkerApp',
        tags: 'one,two',
      });
      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        myWorkerApp: {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      const hasJsonValue = ({ path, expectedValue, lookupFn }) => {
        const config = readJson(tree, path);

        expect(lookupFn(config)).toEqual(expectedValue);
      };

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myDir/myWorkerApp',
      });

      // Make sure these exist
      [
        'myDir/myWorkerApp/src/index.ts',
        'myDir/myWorkerApp/src/index.test.ts',
        'myDir/myWorkerApp/src/index.integration.test.ts',
      ].forEach((path) => {
        expect(tree.exists(path)).toBeTruthy();
      });

      // Make sure these have properties
      [
        {
          path: 'myDir/myWorkerApp/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.outDir,
          expectedValue: '../../dist/out-tsc',
        },
        {
          path: 'myDir/myWorkerApp/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.target,
          expectedValue: 'es2021',
        },
        {
          path: 'myDir/myWorkerApp/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.types,
          expectedValue: [
            'node',
            '@cloudflare/workers-types/experimental',
            '@cloudflare/vitest-pool-workers',
          ],
        },
        {
          path: 'myDir/myWorkerApp/tsconfig.app.json',
          lookupFn: (json) => json.exclude,
          expectedValue: [
            'vite.config.ts',
            'vite.config.mts',
            'vitest.config.ts',
            'vitest.config.mts',
            'src/**/*.test.ts',
            'src/**/*.spec.ts',
            'src/**/*.test.tsx',
            'src/**/*.spec.tsx',
            'src/**/*.test.js',
            'src/**/*.spec.js',
            'src/**/*.test.jsx',
            'src/**/*.spec.jsx',
          ],
        },
        {
          path: 'myDir/myWorkerApp/.eslintrc.json',
          lookupFn: (json) => json.extends,
          expectedValue: ['../../.eslintrc.json'],
        },
      ].forEach(hasJsonValue);
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
        unitTestRunner: 'none',
      });
      expect(tree.exists('jest.config.ts')).toBeFalsy();
      expect(tree.exists('myWorkerApp/src/test-setup.ts')).toBeFalsy();
      expect(tree.exists('myWorkerApp/src/test.ts')).toBeFalsy();
      expect(tree.exists('myWorkerApp/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('myWorkerApp/jest.config.ts')).toBeFalsy();
      expect(tree.exists('myWorkerApp/vite.config.ts')).toBeFalsy();
      const project = readProjectConfiguration(tree, 'myWorkerApp');
      expect(project.targets.test).toBeUndefined();
      expect(project.targets.lint).toMatchInlineSnapshot(`
        {
          "executor": "@nx/eslint:lint",
        }
      `);
    });
  });

  describe('--skipFormat', () => {
    it('should format files by default', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
      });

      expect(devkit.formatFiles).toHaveBeenCalled();
    });

    it('should not format files when --skipFormat=true', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myWorkerApp',
        skipFormat: true,
      });

      expect(devkit.formatFiles).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['fetch-handler' as const, true],
    ['scheduled-handler' as const, true],
    ['hono' as const, true],
    ['none' as const, false],
  ])('--template', (template, checkFile) => {
    it('should generate the correct snippet of code', async () => {
      await applicationGenerator(tree, {
        name: 'api',
        directory: 'api',
        template,
        unitTestRunner: 'none',
      });

      const project = readProjectConfiguration(tree, 'api');
      expect(project.targets.test).toBeUndefined();
      const packageJSON = devkit.readJson(tree, 'api/package.json');
      expect(packageJSON.name).toEqual('api');

      if (checkFile) {
        expect(tree.exists(`api/src/index.ts`)).toBeTruthy();
      } else {
        expect(tree.exists(`api/src/index.ts`)).toBeFalsy();
      }
    });
  });
});
