import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  installPackagesTask,
  joinPathFragments,
  logger,
  Tree,
} from '@nx/devkit';
import { join } from 'node:path';
import type { ConfigurationGeneratorSchema } from './schema';
import {
  findWranglerConfig,
  wranglerSchemaPath,
} from '../../utils/wrangler-config';
import { ensurePluginRegistered } from '../../utils/inference-plugin';
import { resolveProjectRootOrThrow } from '../../utils/project';
import {
  ensureGitignored,
  WORKER_CONFIGURATION_DTS,
} from '../../utils/gitignore';
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

  ensureGitignored(tree, options.projectRoot, WORKER_CONFIGURATION_DTS);

  warnOnLikelyMisconfiguration(tree, options);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return () => installPackagesTask(tree);
}

async function normalizeOptions(
  tree: Tree,
  schema: ConfigurationGeneratorSchema
): Promise<NormalizedSchema> {
  const projectRoot = await resolveProjectRootOrThrow(tree, schema.project);

  const template = schema.template ?? 'worker';
  return {
    projectRoot,
    template,
    name: schema.name ?? toWorkerName(schema.project),
    main: schema.main ?? 'src/index.ts',
    assetsDir: schema.assetsDir ?? 'dist',
    compatibilityDate: schema.compatibilityDate ?? today(),
    nodejsCompat: schema.nodejsCompat ?? false,
    skipFormat: schema.skipFormat ?? false,
    schemaPath: wranglerSchemaPath(projectRoot),
  };
}

// Surface the two ways an authored config can be technically valid yet not work,
// rather than handing back a green run that fails on the first serve/deploy.
function warnOnLikelyMisconfiguration(
  tree: Tree,
  options: NormalizedSchema
): void {
  // Targets are inferred from the wrangler config only when the project root has
  // a project.json or package.json sibling (see plugin.ts) — otherwise this
  // generator wires nothing reachable.
  const hasManifest =
    tree.exists(joinPathFragments(options.projectRoot, 'project.json')) ||
    tree.exists(joinPathFragments(options.projectRoot, 'package.json'));
  if (!hasManifest) {
    logger.warn(
      `${options.projectRoot} has no project.json or package.json — Cloudflare ` +
        `targets won't be inferred until one exists at the project root.`
    );
  }

  // The generator points `main` at the app's own entry (it never scaffolds one);
  // warn when that entry is missing so the user isn't surprised at deploy time.
  if (options.template !== 'spa') {
    const mainPath = joinPathFragments(options.projectRoot, options.main);
    if (!tree.exists(mainPath)) {
      logger.warn(
        `Worker entry "${options.main}" does not exist in ${options.projectRoot}. ` +
          `wrangler.jsonc points "main" at it — create it (or pass --main) before \`nx serve\`/\`nx deploy\`.`
      );
    }
  }
}

// Cloudflare Worker names must be lowercase alphanumeric + hyphens. Derive a
// valid default from a possibly scoped/cased Nx project name (e.g. "@org/My_App"
// → "org-my-app"). An explicit --name is the user's responsibility.
//
// Implemented with split/filter (not an anchored `/^-+|-+$/` trim) so it stays
// linear-time — the trim regex backtracks polynomially on hyphen-heavy input.
function toWorkerName(raw: string): string {
  return raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default configurationGenerator;
