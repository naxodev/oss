import {
  convertNxGenerator,
  formatFiles,
  generateFiles,
  offsetFromRoot,
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
  removeNodeAppTargets(tree, options);

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

  const substitutions = {
    ...options,
    tmpl: '',
    name: options.name,
    extension: options.js ? 'js' : 'ts',
    accountId: options.accountId ?? '',
    configFileName: `wrangler.${options.configFormat}`,
    // Point the JSONC $schema at the wrangler package hoisted to the workspace
    // root so editors validate the config regardless of the project's depth.
    schema: `${offsetFromRoot(
      options.projectRoot
    )}node_modules/wrangler/config-schema.json`,
    // Pin the worker to its creation date so generated workers get a current
    // Workers runtime instead of a stale hardcoded compatibility_date.
    compatibilityDate: new Date().toISOString().split('T')[0],
    port: options.port,
  };

  // General configuration files for workers
  generateFiles(
    tree,
    join(__dirname, './files/common'),
    options.projectRoot,
    substitutions
  );

  // Wrangler config in the selected format (jsonc by default, or toml)
  generateFiles(
    tree,
    join(__dirname, `./files/config/${options.configFormat}`),
    options.projectRoot,
    substitutions
  );

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

// The @nx/node application generator adds Node-oriented targets that don't
// apply to a Cloudflare Worker. Wrangler bundles on deploy, so there is no
// separate `build` step; the @nx/js:node `serve` would shadow the inferred one;
// and `prune`/`prune-lockfile`/`copy-workspace-modules` are Node deployment
// helpers that `dependsOn: ['build']` and would dangle once `build` is gone.
// serve, deploy and the Worker lifecycle targets are inferred by the
// createNodesV2 plugin instead (see plugin.ts). `lint`/`test` are kept.
// This list is coupled to @nx/node's emitted targets; a generator test asserts
// no surviving target depends on a stripped one, so a new build-dependent
// target in a future @nx/node would fail CI rather than dangle silently.
const NODE_APP_TARGETS_TO_REMOVE = [
  'build',
  'serve',
  'prune',
  'prune-lockfile',
  'copy-workspace-modules',
] as const;

function removeNodeAppTargets(tree: Tree, options: NormalizedSchema) {
  const projectConfiguration = readProjectConfiguration(tree, options.name);
  const targets = projectConfiguration.targets;
  if (!targets) {
    return;
  }

  let changed = false;
  for (const target of NODE_APP_TARGETS_TO_REMOVE) {
    if (targets[target]) {
      delete targets[target];
      changed = true;
    }
  }

  if (changed) {
    updateProjectConfiguration(tree, options.name, projectConfiguration);
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
    unitTestRunner: options.unitTestRunner ?? 'vitest',
    template: options.template ?? 'fetch-handler',
    configFormat: options.configFormat ?? 'jsonc',
    port: options.port ?? 8787,
    projectRoot,
    projectType: 'application',
    projectName,
    parsedTags,
  };
}

export default applicationGenerator;
export const applicationSchematic = convertNxGenerator(applicationGenerator);
