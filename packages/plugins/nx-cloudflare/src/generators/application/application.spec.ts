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
        port: 3001,
      });
      const project = readProjectConfiguration(tree, 'my-worker-app');
      expect(project.root).toEqual('my-worker-app');
      expect(project.targets).toEqual(
        expect.objectContaining({
          serve: {
            executor: '@naxodev/nx-cloudflare:serve',
            options: {
              port: 3001,
            },
          },

          publish: {
            executor: '@naxodev/nx-cloudflare:publish',
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
          ],
        }
      `);

      const tsconfigApp = readJson(tree, 'my-worker-app/tsconfig.app.json');
      expect(tsconfigApp.compilerOptions.outDir).toEqual('../dist/out-tsc');
      expect(tsconfigApp.compilerOptions.target).toEqual('es2021');
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

    it('should not generate files when template is none', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        template: 'none',
      });
      expect(tree.exists('my-worker-app/src/index.ts')).toBeFalsy();
      expect(tree.exists('my-worker-app/src/index.test.ts')).toBeFalsy();
    });

    // TODO: Uncomment when Jest support is added back
    // it('should not generate import vitest when testRunner is jest', async () => {
    //   await applicationGenerator(tree, {
    //     name: 'myWorkerApp',
    //     unitTestRunner: 'jest',
    //   });
    //   expect(
    //     tree.read(`my-worker-app/src/index.test.ts`, 'utf-8')
    //   ).not.toContain('vitest');
    // });

    it('should not have test files if the unitTestRunner is none', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        unitTestRunner: 'none',
      });
      expect(tree.exists(`my-worker-app/src/index.test.ts`)).toBeFalsy();
    });

    it('should extend from root tsconfig.json when no tsconfig.base.json', async () => {
      tree.rename('tsconfig.base.json', 'tsconfig.json');

      await applicationGenerator(tree, {
        name: 'myWorkerApp',
      });

      const tsconfig = readJson(tree, 'my-worker-app/tsconfig.json');
      expect(tsconfig.extends).toBe('../tsconfig.json');
    });

    it('should create the common configuration files', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
      });
      expect(tree.exists('my-worker-app/.gitignore')).toBeTruthy();
      expect(tree.exists('my-worker-app/package.json')).toBeTruthy();
      expect(tree.read('my-worker-app/wrangler.toml', 'utf-8'))
        .toMatchInlineSnapshot(`
"name = "my-worker-app"
compatibility_date = "2023-07-31"
main = "src/index.ts"


"
`);
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
          lookupFn: (json) => json.compilerOptions.target,
          expectedValue: 'es2021',
        },
        {
          path: 'my-dir/my-worker-app/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.types,
          expectedValue: ['node', '@cloudflare/workers-types'],
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

  // TODO: Uncomment when jest support is added back
  // describe('--swcJest', () => {
  //   it('should use @swc/jest for jest', async () => {
  //     await applicationGenerator(tree, {
  //       name: 'myWorkerApp',
  //       tags: 'one,two',
  //       swcJest: true,
  //       unitTestRunner: 'jest',
  //     } as Schema);
  //
  //     expect(tree.read(`my-worker-app/jest.config.ts`, 'utf-8'))
  //       .toMatchInlineSnapshot(`
  //       "/* eslint-disable */
  //       export default {
  //         displayName: 'my-worker-app',
  //         preset: '../jest.preset.js',
  //         testEnvironment: 'node',
  //         transform: {
  //           '^.+\\\\.[tj]s$': '@swc/jest',
  //         },
  //         moduleFileExtensions: ['ts', 'js', 'html'],
  //         coverageDirectory: '../coverage/my-worker-app',
  //       };
  //       "
  //     `);
  //   });
  // });

  describe('--js flag', () => {
    it('should generate js files instead of ts files', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        js: true,
      } as Schema);

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
      expect(tree.exists('my-dir/my-worker-app/src/index.js')).toBeTruthy();
      expect(
        tree.exists('my-dir/my-worker-app/src/index.test.js')
      ).toBeTruthy();
    });

    it('should create the common configuration files', async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        js: true,
      });
      expect(tree.exists('my-worker-app/.gitignore')).toBeTruthy();
      expect(tree.exists('my-worker-app/package.json')).toBeTruthy();
      expect(tree.read('my-worker-app/wrangler.toml', 'utf-8'))
        .toMatchInlineSnapshot(`
"name = "my-worker-app"
compatibility_date = "2023-07-31"
main = "src/index.js"


"
`);
    });

    it('should add the account_id field to wrangler.toml when specified', async () => {
      const accountId = 'fake40q5pchj988766d696c1ajek9mcd';
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        js: true,
        accountId,
      });
      expect(tree.read('my-worker-app/wrangler.toml', 'utf-8'))
        .toMatchInlineSnapshot(`
"name = "my-worker-app"
compatibility_date = "2023-07-31"
main = "src/index.js"
account_id = "${accountId}"

"
`);
    });
  });

  describe('--pascalCaseFiles', () => {
    it(`should notify that this flag doesn't do anything`, async () => {
      await applicationGenerator(tree, {
        name: 'myWorkerApp',
        pascalCaseFiles: true,
      } as Schema);
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
    ['scheduled-handler' as const, true],
    ['none' as const, false],
  ])('--template', (template, checkFile) => {
    it('should generate the correct snippet of code', async () => {
      await applicationGenerator(tree, {
        name: 'api',
        template,
      });

      const project = readProjectConfiguration(tree, 'api');
      expect(project.targets.test).toBeDefined();

      if (checkFile) {
        expect(tree.exists(`api/src/index.ts`)).toBeTruthy();
      } else {
        expect(tree.exists(`api/src/index.ts`)).toBeFalsy();
      }
    });
  });
});
