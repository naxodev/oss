import {
  convertNxGenerator,
  extractLayoutDirectory,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  ProjectConfiguration,
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
import { getAccountId } from './utils/get-account-id';

export async function applicationGenerator(tree: Tree, schema: Schema) {
  const options = normalizeOptions(tree, schema);

  // Set up the needed packages.
  const initTask = await initGenerator(tree, {
    ...options,
    skipFormat: true,
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
        '@cloudflare/workers-types',
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
    let projectConfiguration = readProjectConfiguration(tree, options.name);

    projectConfiguration.targets = {
      ...(projectConfiguration.targets ?? {}),
      serve: {
        executor: '@naxodev/nx-cloudflare:serve',
        options: {
          port: options.port,
        },
      },

      publish: {
        executor: '@naxodev/nx-cloudflare:publish',
      },
    };

    if (projectConfiguration.targets.build) {
      delete projectConfiguration.targets.build;
    }

    if (options.unitTestRunner === 'vitest') {
      projectConfiguration = addVitestTarget(
        projectConfiguration,
        options.appProjectRoot
      );
    }

    updateProjectConfiguration(tree, options.name, projectConfiguration);
  } catch (e) {
    console.error(e);
  }
}

function addVitestTarget(
  projectConfiguration: ProjectConfiguration,
  projectRoot: string
): ProjectConfiguration {
  projectConfiguration.targets = {
    ...(projectConfiguration.targets ?? {}),
    test: {
      executor: 'nx:run-commands',
      options: {
        cwd: projectRoot,
        command: 'vitest run',
      },
    },
  };

  return projectConfiguration;
}

function removeTestFiles(tree: Tree, options: NormalizedSchema) {
  tree.delete(join(options.appProjectRoot, 'src', 'index.test.ts'));
}

// Transform the options to the normalized schema. Loads defaults options.
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

export default applicationGenerator;
export const applicationSchematic = convertNxGenerator(applicationGenerator);
