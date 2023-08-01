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

function addTypes(tree: Tree, options: NormalizedSchema) {
  updateJson(
    tree,
    join(options.appProjectRoot, 'tsconfig.app.json'),
    (json) => {
      json.compilerOptions.types = [...json.compilerOptions.types];
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
      }
    );
  }

  if (options.js) {
    toJS(tree);
  }
}

// function updateTsConfigOptions(tree: Tree, options: NormalizedSchema) {
//   updateJson(tree, `${options.appProjectRoot}/tsconfig.json`, (json) => {
//     if (options.rootProject) {
//       return {
//         compilerOptions: {
//           ...tsConfigBaseOptions,
//           ...json.compilerOptions,
//           esModuleInterop: true,
//         },
//         ...json,
//         extends: undefined,
//         exclude: ['node_modules', 'tmp'],
//       };
//     } else {
//       return {
//         ...json,
//         compilerOptions: {
//           ...json.compilerOptions,
//           esModuleInterop: true,
//         },
//       };
//     }
//   });
// }

function addTargets(tree: Tree, appName: string) {
  try {
    const projectConfiguration = readProjectConfiguration(tree, appName);

    projectConfiguration.targets = {
      ...(projectConfiguration.targets ?? {}),
      serve: {
        executor: '@naxodev/nx-cloudflare:serve',
      },

      deploy: {
        executor: '@naxodev/nx-cloudflare:deploy',
      },
    };

    if (projectConfiguration.targets.build) {
      delete projectConfiguration.targets.build;
    }

    updateProjectConfiguration(tree, appName, projectConfiguration);
  } catch (e) {
    console.error(e);
  }
}

export async function applicationGenerator(tree: Tree, schema: Schema) {
  const options = normalizeOptions(tree, schema);
  const initTask = await initGenerator(tree, {
    ...options,
    skipFormat: true,
    unitTestRunner:
      schema.unitTestRunner == 'vitest' ? 'none' : schema.unitTestRunner,
  });
  const applicationTask = await nodeApplicationGenerator(tree, {
    ...schema,
    framework: 'none',
    skipFormat: true,
    unitTestRunner:
      schema.unitTestRunner == 'vitest' ? 'none' : schema.unitTestRunner,
    e2eTestRunner: 'none',
  });
  addCloudflareFiles(tree, options);
  addTypes(tree, options);
  addTargets(tree, options.name);

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
