import {
  addDependenciesToPackageJson,
  createProjectGraphAsync,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getProjects,
  installPackagesTask,
  joinPathFragments,
  offsetFromRoot,
  Tree,
} from '@nx/devkit';
import { join } from 'node:path';
import type { ConfigurationGeneratorSchema } from './schema';
import { findWranglerConfig } from '../../utils/wrangler-config';
import { ensurePluginRegistered } from '../../utils/inference-plugin';
import {
  cloudflareWorkersTypeVersions,
  wranglerVersion,
} from '../../utils/versions';

interface NormalizedSchema {
  projectRoot: string;
  template: 'worker' | 'spa' | 'fullstack';
  name: string;
  main: string;
  assetsDir: string;
  compatibilityDate: string;
  nodejsCompat: boolean;
  skipFormat: boolean;
  schemaPath: string;
}

export async function configurationGenerator(
  tree: Tree,
  schema: ConfigurationGeneratorSchema
): Promise<GeneratorCallback> {
  const options = await normalizeOptions(tree, schema);

  // Don't clobber an existing Cloudflare setup. Adding configuration to a
  // project that already has a wrangler config is a no-op the user should know
  // about — fail loud rather than silently overwrite hand-tuned config.
  const existing = findWranglerConfig(tree, options.projectRoot);
  if (existing) {
    throw new Error(
      `${options.projectRoot} already has a Cloudflare config (${existing
        .split('/')
        .pop()}). The configuration generator targets a project without one.`
    );
  }

  addDependenciesToPackageJson(
    tree,
    {},
    {
      wrangler: wranglerVersion,
      '@cloudflare/workers-types': cloudflareWorkersTypeVersions,
    }
  );
  ensurePluginRegistered(tree);

  generateFiles(
    tree,
    join(__dirname, 'files', options.template),
    options.projectRoot,
    options
  );

  addToGitignore(tree, options.projectRoot, 'worker-configuration.d.ts');

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return () => installPackagesTask(tree);
}

async function normalizeOptions(
  tree: Tree,
  schema: ConfigurationGeneratorSchema
): Promise<NormalizedSchema> {
  const projectRoot = await resolveProjectRoot(tree, schema.project);
  if (!projectRoot) {
    const available = [...getProjects(tree).keys()];
    throw new Error(
      `Project "${schema.project}" not found.` +
        (available.length ? ` Available projects: ${available.join(', ')}` : '')
    );
  }

  const template = schema.template ?? 'worker';
  return {
    projectRoot,
    template,
    name: schema.name ?? schema.project,
    main: schema.main ?? 'src/index.ts',
    assetsDir: schema.assetsDir ?? 'dist',
    compatibilityDate: schema.compatibilityDate ?? today(),
    nodejsCompat: schema.nodejsCompat ?? false,
    skipFormat: schema.skipFormat ?? false,
    schemaPath: `${offsetFromRoot(
      projectRoot
    )}node_modules/wrangler/config-schema.json`,
  };
}

// Resolve a project's root, preferring the Tree (which sees project.json /
// package.json projects — all that's available in unit tests) and falling back
// to the project graph so inference-only Workers resolve too. Mirrors the
// binding generator's resolveProjectRoot.
async function resolveProjectRoot(
  tree: Tree,
  name: string
): Promise<string | null> {
  const fromTree = getProjects(tree).get(name);
  if (fromTree) {
    return fromTree.root;
  }
  try {
    const graph = await createProjectGraphAsync({ exitOnError: false });
    return graph.nodes[name]?.data.root ?? null;
  } catch {
    return null;
  }
}

function addToGitignore(tree: Tree, projectRoot: string, entry: string): void {
  const path = joinPathFragments(projectRoot, '.gitignore');
  const existing = tree.exists(path) ? tree.read(path, 'utf-8') ?? '' : '';
  const lines = existing.split('\n').map((line) => line.trim());
  if (lines.includes(entry)) {
    return;
  }
  const prefix = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  tree.write(path, `${existing}${prefix}${entry}\n`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default configurationGenerator;
