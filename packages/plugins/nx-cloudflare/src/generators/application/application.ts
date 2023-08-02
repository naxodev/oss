import {
  convertNxGenerator,
  extractLayoutDirectory,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  toJS,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit';
import { applicationGenerator as nodeApplicationGenerator } from '@nx/node';
import type { NormalizedSchema, Schema } from './schema';
import { join } from 'path';
import initGenerator from '../init/init';
import { vitestImports } from './utils/vitest-imports';

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
        '@cloudflare/workers-types',
      ];
      return json;
    }
  );
}

function addCloudflareFiles(tree: Tree, options: NormalizedSchema) {
  // Delete main.ts. Workers convention is a file named `index.js` or `index.ts
  tree.delete(
    join(options.appProjectRoot, `src/main.${options.js ? 'js' : 'ts'}`)
  );

  generateFiles(
    tree,
    join(__dirname, './files/common'),
    options.appProjectRoot,
    {
      ...options,
      tmpl: '',
      name: options.name,
    }
  );

  // TODO: if the testRunner is none, delete the test files
  if (options.template && options.template !== 'none') {
    generateFiles(
      tree,
      join(__dirname, `./files/${options.template}`),
      join(options.appProjectRoot, 'src'),
      {
        ...options,
        tmpl: '',
        name: options.name,
        root: options.appProjectRoot,
        offset: offsetFromRoot(options.appProjectRoot),
        vitestImports: options.unitTestRunner === 'vitest' ? vitestImports : '',
      }
    );
  }

  if (options.js) {
    toJS(tree);
  }
}

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
}

export async function applicationGenerator(tree: Tree, schema: Schema) {
  const options = normalizeOptions(tree, schema);

  // Set up the needed packages.
  const initTask = await initGenerator(tree, {
    ...options,
    skipFormat: true,
    unitTestRunner:
      options.unitTestRunner == 'vitest' ? 'none' : options.unitTestRunner,
  });

  const applicationTask = await nodeApplicationGenerator(tree, {
    ...options,
    framework: 'none',
    skipFormat: true,
    unitTestRunner:
      options.unitTestRunner == 'vitest' ? 'none' : options.unitTestRunner,
    e2eTestRunner: 'none',
    name: schema.name,
  });

  addCloudflareFiles(tree, options);
  updateTsAppConfig(tree, options);
  addTargets(tree, options);

  if (options.unitTestRunner === 'none') {
    removeTestFiles(tree, options);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return async () => {
    await initTask();
    await applicationTask();
  };
}

export default applicationGenerator;
export const applicationSchematic = convertNxGenerator(applicationGenerator);

function normalizeOptions(host: Tree, options: Schema): NormalizedSchema {
  const { layoutDirectory, projectDirectory } = extractLayoutDirectory(
    options.directory
  );
  const appsDir = layoutDirectory ?? getWorkspaceLayout(host).appsDir;

  const appDirectory = projectDirectory
    ? `${names(projectDirectory).fileName}/${names(options.name).fileName}`
    : names(options.name).fileName;

  const appProjectName = appDirectory.replace(new RegExp('/', 'g'), '-');

  const appProjectRoot = options.rootProject
    ? '.'
    : joinPathFragments(appsDir, appDirectory);

  return {
    ...options,
    name: names(appProjectName).fileName,
    frontendProject: options.frontendProject
      ? names(options.frontendProject).fileName
      : undefined,
    appProjectRoot,
    unitTestRunner: options.unitTestRunner ?? 'vitest',
    rootProject: options.rootProject ?? false,
    template: options.template ?? 'fetch-handler',
    port: options.port ?? 3000,
  };
}
