import {
  convertNxGenerator,
  ensurePackage,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  readProjectConfiguration,
  runTasksInSerial,
  toJS,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit';
import { applicationGenerator as nodeApplicationGenerator } from '@nx/node';
import type { NormalizedSchema, Schema } from './schema';
import { join } from 'path';
import initGenerator from '../init/generator';
import { vitestImports } from './utils/vitest-imports';
import { getAccountId } from './utils/get-account-id';
import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';
import { nxVersion } from '@nx/node/src/utils/versions';

export async function applicationGenerator(tree: Tree, schema: Schema) {
  const options = await normalizeOptions(tree, schema);

  const tasks: GeneratorCallback[] = [];

  // Set up the needed packages.
  tasks.push(
    await initGenerator(tree, {
      ...options,
      skipFormat: true,
    })
  );

  tasks.push(
    await nodeApplicationGenerator(tree, {
      ...options,
      framework: 'none',
      skipFormat: true,
      unitTestRunner:
        options.unitTestRunner == 'vitest' ? 'none' : options.unitTestRunner,
      e2eTestRunner: 'none',
      name: schema.name,
    })
  );

  if (options.unitTestRunner === 'vitest') {
    const { vitestGenerator, createOrEditViteConfig } = ensurePackage(
      '@nx/vite',
      nxVersion
    );
    const vitestTask = await vitestGenerator(tree, {
      project: options.name,
      uiFramework: 'none',
      coverageProvider: 'v8',
      skipFormat: true,
      testEnvironment: 'node',
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.toml' },
        },
      },
    });
    tasks.push(vitestTask);
    createOrEditViteConfig(
      tree,
      {
        project: options.name,
        includeLib: false,
        includeVitest: true,
        testEnvironment: 'node',
      },
      true
    );
  }

  addCloudflareFiles(tree, options);
  updateTsAppConfig(tree, options);
  addTargets(tree, options);

  if (options.unitTestRunner === 'none') {
    removeTestFiles(tree, options);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}

// Modify the default tsconfig.app.json generate by the node application generator to support workers.
function updateTsAppConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(
    tree,
    join(options.appProjectRoot, 'tsconfig.app.json'),
    (json) => {
      json.compilerOptions = {
        ...json.compilerOptions,
        esModuleInterop: true,
        target: 'es2021',
        lib: ['es2021'],
        module: 'es2022',
        moduleResolution: 'node',
        resolveJsonModule: true,

        allowJs: true,
        checkJs: false,
        noEmit: true,

        isolatedModules: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,

        strict: true,
        skipLibCheck: true,
      };
      json.compilerOptions.types = [
        ...json.compilerOptions.types,
        '@cloudflare/workers-types/experimental',
        '@cloudflare/vitest-pool-workers',
      ];
      return json;
    }
  );
}

// Adds the needed files from the common folder and the selected template folder
function addCloudflareFiles(tree: Tree, options: NormalizedSchema) {
  // Delete main.ts. Workers convention is a file named `index.js` or `index.ts
  tree.delete(
    join(options.appProjectRoot, `src/main.${options.js ? 'js' : 'ts'}`)
  );

  // General configuration files for workers
  generateFiles(
    tree,
    join(__dirname, './files/common'),
    options.appProjectRoot,
    {
      ...options,
      tmpl: '',
      name: options.name,
      extension: options.js ? 'js' : 'ts',
      accountId: options.accountId ? getAccountId(options.accountId) : '',
    }
  );

  // Generate template files with workers code
  if (options.template && options.template !== 'none') {
    generateFiles(
      tree,
      join(__dirname, `./files/${options.template}`),
      join(options.appProjectRoot, 'src'),
      {
        ...options,
        tmpl: '',
        name: options.name,
        vitestImports: options.unitTestRunner === 'vitest' ? vitestImports : '',
      }
    );
  }

  // Modify the files extension and content to use vanilla JavaScript
  if (options.js) {
    toJS(tree);
  }
}

// Adds the targets to the project configuration
function addTargets(tree: Tree, options: NormalizedSchema) {
  try {
    const projectConfiguration = readProjectConfiguration(tree, options.name);

    projectConfiguration.targets = {
      ...(projectConfiguration.targets ?? {}),
      serve: {
        executor: '@naxodev/nx-cloudflare:serve',
        options: {
          port: options.port,
        },
      },

      deploy: {
        executor: '@naxodev/nx-cloudflare:deploy',
      },
    };

    if (projectConfiguration.targets.build) {
      delete projectConfiguration.targets.build;
    }

    updateProjectConfiguration(tree, options.name, projectConfiguration);
  } catch (e) {
    console.error(e);
  }
}

function removeTestFiles(tree: Tree, options: NormalizedSchema) {
  tree.delete(join(options.appProjectRoot, 'src', 'index.test.ts'));
  tree.delete(join(options.appProjectRoot, 'src', 'index.integration.test.ts'));
}

// Transform the options to the normalized schema. Loads defaults options.
async function normalizeOptions(
  host: Tree,
  options: Schema
): Promise<NormalizedSchema> {
  const {
    projectName: appProjectName,
    projectRoot: appProjectRoot,
    projectNameAndRootFormat,
  } = await determineProjectNameAndRootOptions(host, {
    name: options.name,
    projectType: 'application',
    directory: options.directory,
    projectNameAndRootFormat: options.projectNameAndRootFormat,
    rootProject: options.rootProject,
    callingGenerator: '@nx/node:application',
  });
  options.rootProject = appProjectRoot === '.';
  options.projectNameAndRootFormat = projectNameAndRootFormat;

  return {
    addPlugin: process.env.NX_ADD_PLUGINS !== 'false',
    ...options,
    name: appProjectName,
    frontendProject: options.frontendProject,
    appProjectRoot,
    projectNameAndRootFormat: options.projectNameAndRootFormat ?? 'as-provided',
    unitTestRunner: options.unitTestRunner ?? 'vitest',
    rootProject: options.rootProject ?? false,
    template: options.template ?? 'fetch-handler',
    port: options.port ?? 3000,
  };
}

export default applicationGenerator;
export const applicationSchematic = convertNxGenerator(applicationGenerator);
