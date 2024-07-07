import { Tree, formatFiles, updateJson } from '@nx/devkit';
import type {
  NormalizedSchema,
  NxCloudflareLibraryGeneratorSchema,
} from './schema';
import { libraryGenerator } from '@nx/js';
import { join } from 'path';
import initGenerator from '../init/generator';
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
  options.projectNameAndRootFormat =
    options.projectNameAndRootFormat ?? 'as-provided';

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
      options.bundler = 'tsc';
    }
  }

  if (options.config === 'npm-scripts') {
    options.unitTestRunner = 'none';
    options.linter = 'none';
    options.bundler = 'none';
  }

  if (!options.linter && options.config !== 'npm-scripts') {
    options.linter = 'none';
  }

  const { projectName, projectRoot, importPath } =
    await determineProjectNameAndRootOptions(tree, {
      name: options.name,
      projectType: 'library',
      directory: options.directory,
      importPath: options.importPath,
      projectNameAndRootFormat: options.projectNameAndRootFormat,
      rootProject: options.rootProject,
      callingGenerator: '@nx/js:library',
    });
  options.rootProject = projectRoot === '.';

  options.minimal ??= false;

  return {
    ...options,
    name: projectName,
    libProjectRoot: projectRoot,
    importPath,
  };
}

function updateTsLibConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(
    tree,
    join(options.libProjectRoot, 'tsconfig.lib.json'),
    (json) => {
      json.compilerOptions.types = [
        ...json.compilerOptions.types,
        '@cloudflare/workers-types/experimental',
        '@cloudflare/vitest-pool-workers',
      ];
      return json;
    }
  );
}

export default nxCloudflareWorkerLibraryGenerator;
