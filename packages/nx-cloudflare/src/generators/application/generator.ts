import {
  convertNxGenerator,
  formatFiles,
  generateFiles,
  readProjectConfiguration,
  toJS,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit';
import { applicationGenerator as nodeApplicationGenerator } from '@nx/node';
import { configurationGenerator as vitestConfigurationGenerator } from '@nx/vitest/generators';
import type { NormalizedSchema, Schema } from './schema';
import { join } from 'path';
import initGenerator from '../init/generator';
import { vitestImports } from './utils/vitest-imports';
import { getAccountId } from './utils/get-account-id';
import {
  determineProjectNameAndRootOptions,
  ensureRootProjectName,
} from '@nx/devkit/src/generators/project-name-and-root-utils';

export async function applicationGenerator(tree: Tree, schema: Schema) {
  const options = await normalizeOptions(tree, schema);

  await initGenerator(tree, {
    ...options,
    skipFormat: true,
  });

  await nodeApplicationGenerator(tree, {
    ...options,
    framework: 'none',
    skipFormat: true,
    unitTestRunner:
      options.unitTestRunner == 'vitest' ? 'none' : options.unitTestRunner,
    e2eTestRunner: 'none',
    name: options.name,
    directory: options.directory,
  });

  if (options.unitTestRunner === 'vitest') {
    await vitestConfigurationGenerator(tree, {
      project: options.name,
      uiFramework: 'none',
      coverageProvider: 'v8',
      skipFormat: true,
      testEnvironment: 'node',
    });
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
}

// Modify the default tsconfig.app.json generate by the node application generator to support workers.
function updateTsAppConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(tree, join(options.projectRoot, 'tsconfig.app.json'), (json) => {
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
  });
}

// Adds the needed files from the common folder and the selected template folder
function addCloudflareFiles(tree: Tree, options: NormalizedSchema) {
  // Delete main.ts. Workers convention is a file named `index.js` or `index.ts
  tree.delete(
    join(options.projectRoot, `src/main.${options.js ? 'js' : 'ts'}`)
  );

  // General configuration files for workers
  generateFiles(tree, join(__dirname, './files/common'), options.projectRoot, {
    ...options,
    tmpl: '',
    name: options.name,
    extension: options.js ? 'js' : 'ts',
    accountId: options.accountId ? getAccountId(options.accountId) : '',
  });

  // Generate template files with workers code
  if (options.template && options.template !== 'none') {
    generateFiles(
      tree,
      join(__dirname, `./files/${options.template}`),
      join(options.projectRoot, 'src'),
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
  tree.delete(join(options.projectRoot, 'src', 'index.test.ts'));
  tree.delete(join(options.projectRoot, 'src', 'index.integration.test.ts'));
}

// Transform the options to the normalized schema. Loads defaults options.
async function normalizeOptions(
  host: Tree,
  options: Schema
): Promise<NormalizedSchema> {
  await ensureRootProjectName(options, 'application');
  const { projectName, projectRoot } = await determineProjectNameAndRootOptions(
    host,
    {
      name: options.name,
      projectType: 'application',
      directory: options.directory,
    }
  );

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    name: projectName,
    frontendProject: options.frontendProject,
    unitTestRunner: options.unitTestRunner ?? 'vitest',
    template: options.template ?? 'fetch-handler',
    port: options.port ?? 3000,
    projectRoot,
    projectType: 'application',
    projectName,
    parsedTags,
  };
}

export default applicationGenerator;
export const applicationSchematic = convertNxGenerator(applicationGenerator);
