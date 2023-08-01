import * as devkit from '@nx/devkit';
import {
  getProjects,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { applicationGenerator as angularApplicationGenerator } from '@nx/angular/generators';
import { Schema } from './schema';
import { applicationGenerator } from './application';

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
      });
      const project = readProjectConfiguration(tree, 'my-worker-app');
      expect(project.root).toEqual('my-worker-app');
      expect(project.targets).toEqual(
        expect.objectContaining({
          serve: {
            executor: '@naxodev/nx-cloudflare:serve',
          },

          deploy: {
            executor: '@naxodev/nx-cloudflare:deploy',
          },
        })
      );
      expect(project.targets.build).toBeUndefined();
      expect(project.targets.lint).toEqual({
        executor: '@nx/linter:eslint',
        outputs: ['{options.outputFile}'],
        options: {
          lintFilePatterns: ['my-worker-app/**/*.ts'],
        },
      });
    });

    it('should update tags', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        tags: 'one,two',
      });
      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        'my-worker-app': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
      });
      expect(tree.exists(`my-worker-app/jest.config.ts`)).toBeTruthy();
      expect(tree.exists('my-worker-app/src/index.ts')).toBeTruthy();
      expect(tree.exists('my-worker-app/src/index.test.ts')).toBeTruthy();

      const tsconfig = readJson(tree, 'my-worker-app/tsconfig.json');
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

      const tsconfigApp = readJson(tree, 'my-worker-app/tsconfig.app.json');
      expect(tsconfigApp.compilerOptions.outDir).toEqual('../dist/out-tsc');
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');
      expect(tsconfigApp.exclude).toEqual([
        'jest.config.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
      ]);
      const eslintrc = readJson(tree, 'my-worker-app/.eslintrc.json');
      expect(eslintrc).toMatchInlineSnapshot(`
        {
          "extends": [
            "../.eslintrc.json",
          ],
          "ignorePatterns": [
            "!**/*",
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

    it('should extend from root tsconfig.json when no tsconfig.base.json', async () => {
      tree.rename('tsconfig.base.json', 'tsconfig.json');

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
      });

      const tsconfig = readJson(tree, 'my-worker-app/tsconfig.json');
      expect(tsconfig.extends).toBe('../tsconfig.json');
    });
  });

  describe('nested', () => {
    it('should update project config', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myDir',
      });
      const project = readProjectConfiguration(tree, 'my-dir-my-worker-app');

      expect(project.root).toEqual('my-dir/my-worker-app');

      expect(project.targets.lint).toEqual({
        executor: '@nx/linter:eslint',
        outputs: ['{options.outputFile}'],
        options: {
          lintFilePatterns: ['my-dir/my-worker-app/**/*.ts'],
        },
      });

      expect(() =>
        readProjectConfiguration(tree, 'my-dir-my-worker-app-e2e')
      ).toThrow(/Cannot find/);
    });

    it('should update tags', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myDir',
        tags: 'one,two',
      });
      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        'my-dir-my-worker-app': {
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
        directory: 'myDir',
      });

      // Make sure these exist
      [
        `my-dir/my-worker-app/jest.config.ts`,
        'my-dir/my-worker-app/src/index.ts',
        'my-dir/my-worker-app/src/index.test.ts',
      ].forEach((path) => {
        expect(tree.exists(path)).toBeTruthy();
      });

      // Make sure these have properties
      [
        {
          path: 'my-dir/my-worker-app/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.outDir,
          expectedValue: '../../dist/out-tsc',
        },
        {
          path: 'my-dir/my-worker-app/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.types,
          expectedValue: ['node'],
        },
        {
          path: 'my-dir/my-worker-app/tsconfig.app.json',
          lookupFn: (json) => json.exclude,
          expectedValue: [
            'jest.config.ts',
            'src/**/*.spec.ts',
            'src/**/*.test.ts',
          ],
        },
        {
          path: 'my-dir/my-worker-app/.eslintrc.json',
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
        unitTestRunner: 'none',
      });
      expect(tree.exists('jest.config.ts')).toBeFalsy();
      expect(tree.exists('my-worker-app/src/test-setup.ts')).toBeFalsy();
      expect(tree.exists('my-worker-app/src/test.ts')).toBeFalsy();
      expect(tree.exists('my-worker-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('my-worker-app/jest.config.ts')).toBeFalsy();
      const project = readProjectConfiguration(tree, 'my-worker-app');
      expect(project.targets.test).toBeUndefined();
      expect(project.targets.lint).toMatchInlineSnapshot(`
        {
          "executor": "@nx/linter:eslint",
          "options": {
            "lintFilePatterns": [
              "my-worker-app/**/*.ts",
            ],
          },
          "outputs": [
            "{options.outputFile}",
          ],
        }
      `);
    });
  });

  describe('--frontendProject', () => {
    it('should configure proxy', async () => {
      await angularApplicationGenerator(tree, { name: 'my-frontend' });

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        frontendProject: 'my-frontend',
      });

      expect(tree.exists('my-frontend/proxy.conf.json')).toBeTruthy();
      const project = readProjectConfiguration(tree, 'my-frontend');
      const serve = project.targets.serve;
      expect(serve.options.proxyConfig).toEqual('my-frontend/proxy.conf.json');
    });

    it('should configure proxies for multiple node projects with the same frontend app', async () => {
      await angularApplicationGenerator(tree, { name: 'my-frontend' });

      await applicationGenerator(tree, {
        name: 'cart',
        frontendProject: 'my-frontend',
      });

      await applicationGenerator(tree, {
        name: 'billing',
        frontendProject: 'my-frontend',
      });

      expect(tree.exists('my-frontend/proxy.conf.json')).toBeTruthy();

      expect(readJson(tree, 'my-frontend/proxy.conf.json')).toEqual({
        '/api': { target: 'http://localhost:3000', secure: false },
        '/billing-api': { target: 'http://localhost:3000', secure: false },
      });
    });

    it('should work with unnormalized project names', async () => {
      await angularApplicationGenerator(tree, { name: 'myFrontend' });

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        frontendProject: 'myFrontend',
      });

      expect(tree.exists('my-frontend/proxy.conf.json')).toBeTruthy();
      const project = readProjectConfiguration(tree, 'my-frontend');
      const serve = project.targets.serve;
      expect(serve.options.proxyConfig).toEqual('my-frontend/proxy.conf.json');
    });
  });

  describe('--swcJest', () => {
    it('should use @swc/jest for jest', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        tags: 'one,two',
        swcJest: true,
      } as Schema);

      expect(tree.read(`my-worker-app/jest.config.ts`, 'utf-8'))
        .toMatchInlineSnapshot(`
        "/* eslint-disable */
        export default {
          displayName: 'my-worker-app',
          preset: '../jest.preset.js',
          testEnvironment: 'node',
          transform: {
            '^.+\\\\.[tj]s$': '@swc/jest',
          },
          moduleFileExtensions: ['ts', 'js', 'html'],
          coverageDirectory: '../coverage/my-worker-app',
        };
        "
      `);
    });
  });

  describe('--babelJest (deprecated)', () => {
    it('should use babel for jest', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        tags: 'one,two',
        babelJest: true,
      } as Schema);

      expect(tree.read(`my-worker-app/jest.config.ts`, 'utf-8'))
        .toMatchInlineSnapshot(`
        "/* eslint-disable */
        export default {
          displayName: 'my-worker-app',
          preset: '../jest.preset.js',
          testEnvironment: 'node',
          transform: {
            '^.+\\\\.[tj]s$': 'babel-jest',
          },
          moduleFileExtensions: ['ts', 'js', 'html'],
          coverageDirectory: '../coverage/my-worker-app',
        };
        "
      `);
    });
  });

  describe('--js flag', () => {
    it('should generate js files instead of ts files', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        js: true,
      } as Schema);

      expect(tree.exists(`my-worker-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('my-worker-app/src/index.js')).toBeTruthy();
      expect(tree.exists('my-worker-app/src/index.test.js')).toBeTruthy();

      const tsConfig = readJson(tree, 'my-worker-app/tsconfig.json');
      expect(tsConfig.compilerOptions).toEqual({
        allowJs: true,
        esModuleInterop: true,
      });

      const tsConfigApp = readJson(tree, 'my-worker-app/tsconfig.app.json');
      expect(tsConfigApp.include).toEqual(['src/**/*.ts', 'src/**/*.js']);
      expect(tsConfigApp.exclude).toEqual([
        'jest.config.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.js',
        'src/**/*.test.js',
      ]);
    });

    it('should add project config', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        js: true,
      } as Schema);
      const project = readProjectConfiguration(tree, 'my-worker-app');
      const buildTarget = project.targets.build;
      const serveTarget = project.targets.serve;

      expect(serveTarget.executor).toEqual('@naxodev/nx-cloudflare:serve');
      expect(buildTarget).toBeUndefined();
    });

    it('should generate js files for nested libs as well', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        directory: 'myDir',
        js: true,
      } as Schema);
      expect(tree.exists(`my-dir/my-worker-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('my-dir/my-worker-app/src/index.js')).toBeTruthy();
      expect(
        tree.exists('my-dir/my-worker-app/src/index.test.js')
      ).toBeTruthy();
    });
  });

  describe('--pascalCaseFiles', () => {
    it(`should notify that this flag doesn't do anything`, async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        pascalCaseFiles: true,
      } as Schema);

      // @TODO how to spy on context ?
      // expect(contextLoggerSpy).toHaveBeenCalledWith('NOTE: --pascalCaseFiles is a noop')
    });
  });

  describe('--skipFormat', () => {
    it('should format files by default', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, { name: 'myWorkerApp' });

      expect(devkit.formatFiles).toHaveBeenCalled();
    });

    it('should not format files when --skipFormat=true', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        skipFormat: true,
      });

      expect(devkit.formatFiles).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['fetch-handler' as const, true],
    ['scheduled-handler' as const, false],
    ['none' as const, false],
  ])('--unitTestRunner', (template, checkSpecFile) => {
    it('should generate test target and spec file by default', async () => {
      await applicationGenerator(tree, {
        name: 'api',
        template,
      });

      const project = readProjectConfiguration(tree, 'api');
      expect(project.targets.test).toBeDefined();

      if (checkSpecFile) {
        expect(tree.exists(`api/src/index.test.ts`)).toBeTruthy();
      }
    });
  });
});
