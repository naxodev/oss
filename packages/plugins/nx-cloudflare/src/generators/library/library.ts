import {
  Tree,
  extractLayoutDirectory,
  formatFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  updateJson,
} from '@nx/devkit';
import type {
  NormalizedSchema,
  NxCloudflareLibraryGeneratorSchema,
} from './schema';
import { libraryGenerator } from '@nx/js';
import { join } from 'path';
import initGenerator from '../init/init';
import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';

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

  const libraryTask = await libraryGenerator(tree, options);
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
  const { projectName, projectRoot } = await determineProjectNameAndRootOptions(
    tree,
    {
      name: options.name,
      projectType: 'library',
      directory: options.directory,
      importPath: options.importPath,
      projectNameAndRootFormat: options.projectNameAndRootFormat,
      rootProject: options.rootProject,
      callingGenerator: '@nx/js:library',
    }
  );

  return {
    ...options,
    libProjectRoot: projectRoot,
    name: projectName,
  };
}

function updateTsLibConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(
    tree,
    join(options.libProjectRoot, 'tsconfig.lib.json'),
    (json) => {
      json.compilerOptions.types = [
        ...json.compilerOptions.types,
        '@cloudflare/workers-types',
      ];
      return json;
    }
  );
}

export default nxCloudflareWorkerLibraryGenerator;
