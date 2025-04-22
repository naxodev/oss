import { Tree, formatFiles, names, updateJson } from '@nx/devkit';
import type {
  NormalizedSchema,
  NxCloudflareLibraryGeneratorSchema,
} from './schema';
import { libraryGenerator } from '@nx/js';
import { join } from 'path';
import initGenerator from '../init/generator';
import {
  determineProjectNameAndRootOptions,
  ensureRootProjectName,
} from '@nx/devkit/src/generators/project-name-and-root-utils';
import { getImportPath } from '@nx/js/src/utils/get-import-path';
import { normalizeLinterOption } from '@nx/js/src/utils/generator-prompts';
import {
  isUsingTsSolutionSetup,
  isUsingTypeScriptPlugin,
} from '@nx/js/src/utils/typescript/ts-solution-setup';
import { promptWhenInteractive } from '@nx/devkit/src/generators/prompt';

export async function nxCloudflareWorkerLibraryGenerator(
  tree: Tree,
  schema: NxCloudflareLibraryGeneratorSchema
) {
  const options = await normalizeOptions(tree, schema);

  // Set up the needed packages.
  const initTask = await initGenerator(tree, {
    ...options,
    skipFormat: true,
  });

  const libraryTask = await libraryGenerator(tree, { 
    ...options, 
    // Use name as the directory if directory is not provided
    directory: options.directory || options.name 
  });
  updateTsLibConfig(tree, options);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return async () => {
    await initTask();
    await libraryTask();
  };
}

async function normalizeOptions(
  tree: Tree,
  options: NxCloudflareLibraryGeneratorSchema
): Promise<NormalizedSchema> {
  await ensureRootProjectName({
    name: options.name,
    // Use name as the directory if directory is not provided
    directory: options.directory || options.name
  }, 'library');

  options.linter = await normalizeLinterOption(tree, options.linter);

  const hasPlugin = isUsingTypeScriptPlugin(tree);
  const isUsingTsSolutionConfig = isUsingTsSolutionSetup(tree);

  if (isUsingTsSolutionConfig) {
    options.unitTestRunner ??= await promptWhenInteractive<{
      unitTestRunner: 'none' | 'vitest';
    }>(
      {
        type: 'autocomplete',
        name: 'unitTestRunner',
        message: `Which unit test runner would you like to use?`,
        choices: [{ name: 'none' }, { name: 'vitest' }, { name: 'jest' }],
        initial: 0,
      },
      { unitTestRunner: 'none' }
    ).then(({ unitTestRunner }) => unitTestRunner);
  } else {
    options.unitTestRunner ??= await promptWhenInteractive<{
      unitTestRunner: 'none' | 'vitest';
    }>(
      {
        type: 'autocomplete',
        name: 'unitTestRunner',
        message: `Which unit test runner would you like to use?`,
        choices: [{ name: 'jest' }, { name: 'vitest' }, { name: 'none' }],
        initial: 0,
      },
      { unitTestRunner: 'none' }
    ).then(({ unitTestRunner }) => unitTestRunner);

    if (!options.unitTestRunner && options.bundler === 'vite') {
      options.unitTestRunner = 'vitest';
    } else if (!options.unitTestRunner && options.config !== 'npm-scripts') {
      options.unitTestRunner = 'vitest';
    }
  }

  // ensure programmatic runs have an expected default
  if (!options.config) {
    options.config = 'project';
  }

  if (options.publishable) {
    if (!options.importPath) {
      throw new Error(
        `For publishable libs you have to provide a proper "--importPath" which needs to be a valid npm package name (e.g. my-awesome-lib or @myorg/my-lib)`
      );
    }

    if (options.bundler === 'none') {
      throw new Error(
        `Publishable libraries can't be generated with "--bundler=none". Please select a valid bundler.`
      );
    }
  }

  // This is to preserve old behavior, buildable: false
  if (options.publishable === false) {
    options.bundler = 'none';
  }

  if (options.config === 'npm-scripts') {
    options.unitTestRunner = 'none';
    options.linter = 'none';
    options.bundler = 'none';
  }

  if (
    (options.bundler === 'swc' || options.bundler === 'rollup') &&
    (options.skipTypeCheck == null || !isUsingTsSolutionConfig)
  ) {
    options.skipTypeCheck = false;
  }

  const {
    projectName,
    names: projectNames,
    projectRoot,
    importPath,
  } = await determineProjectNameAndRootOptions(tree, {
    name: options.name,
    projectType: 'library',
    // Use name as the directory if directory is not provided
    directory: options.directory || options.name,
    importPath: options.importPath,
    rootProject: options.rootProject,
  });
  options.rootProject = projectRoot === '.';
  const fileName = names(
    options.simpleName
      ? projectNames.projectSimpleName
      : projectNames.projectFileName
  ).fileName;

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  options.minimal ??= false;

  // We default to generate a project.json file if the new setup is not being used
  options.useProjectJson ??= !isUsingTsSolutionConfig;

  return {
    ...options,
    fileName,
    name: isUsingTsSolutionConfig
      ? getImportPath(tree, projectName)
      : projectName,
    projectNames,
    projectRoot,
    parsedTags,
    importPath,
    hasPlugin,
    isUsingTsSolutionConfig,
  };
}

function updateTsLibConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(tree, join(options.projectRoot, 'tsconfig.lib.json'), (json) => {
    json.compilerOptions.types = [
      ...json.compilerOptions.types,
      '@cloudflare/workers-types/experimental',
      '@cloudflare/vitest-pool-workers',
    ];
    return json;
  });
}

export default nxCloudflareWorkerLibraryGenerator;
