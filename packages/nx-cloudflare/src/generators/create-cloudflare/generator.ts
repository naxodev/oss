import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  detectPackageManager,
  formatFiles,
  GeneratorCallback,
  installPackagesTask,
  joinPathFragments,
  logger,
  offsetFromRoot,
  readNxJson,
  Tree,
  updateJson,
  updateNxJson,
  writeJson,
} from '@nx/devkit';
import {
  determineProjectNameAndRootOptions,
  ensureRootProjectName,
} from '@nx/devkit/internal';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { NormalizedSchema, Schema } from './schema';
import { createCloudflareVersion, nxVitestVersion } from '../../utils/versions';
import { runC3 } from '../../utils/run-c3';
import { importDirectoryToTree } from '../../utils/import-tree';

/**
 * Scaffolds a Cloudflare Worker application by delegating to Cloudflare's
 * create-cloudflare (C3) CLI, then imports the result into the Nx workspace and
 * wires it up (Wrangler target inference, workspace-managed dependencies).
 */
export async function createCloudflareGenerator(
  tree: Tree,
  schema: Schema
): Promise<GeneratorCallback> {
  const options = await normalizeOptions(tree, schema);

  // C3 writes to the real filesystem, so scaffold into a temp dir and import the
  // result into the virtual Tree. The temp dir is always cleaned up.
  const scaffoldRoot = mkdtempSync(join(tmpdir(), 'nx-c3-'));
  const scaffoldDir = join(scaffoldRoot, options.projectName);
  try {
    runC3({
      packageManager: options.packageManager,
      c3Version: options.c3Version,
      directory: scaffoldDir,
      type: options.type,
      framework: options.framework,
      template: options.template,
      lang: options.lang,
      c3Args: options.c3Args,
    });

    importDirectoryToTree(tree, scaffoldDir, options.projectRoot);
  } finally {
    rmSync(scaffoldRoot, { recursive: true, force: true });
  }

  pruneScaffoldExtras(tree, options.projectRoot);
  handleGeneratedTypes(tree, options.projectRoot);
  updateProjectPackageJson(tree, options);
  retargetWranglerSchema(tree, options.projectRoot);
  ensurePluginRegistered(tree, INFERENCE_PLUGIN);
  ensureVitestTestTarget(tree, options.projectRoot);
  maybeWriteProjectJson(tree, options);
  warnIfNoWranglerConfig(tree, options.projectRoot);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  // C3 installs inside the (discarded) temp scaffold; the project's deps are
  // reconciled by a single install at the workspace root.
  return () => installPackagesTask(tree);
}

// Editor/agent config C3 scaffolds that conflicts with or duplicates
// workspace-level config: a project `.editorconfig` with `root = true` halts the
// workspace cascade, a `.prettierrc` makes `nx format` reformat the project
// inconsistently, `.vscode` settings belong at the workspace root, and AGENTS.md
// is per-template noise. The worker's `.gitignore` is kept — it carries the
// useful wrangler ignores (.wrangler/, .dev.vars).
const C3_EXTRAS_TO_PRUNE = [
  '.prettierrc',
  '.editorconfig',
  'AGENTS.md',
  '.vscode',
];

function pruneScaffoldExtras(tree: Tree, projectRoot: string): void {
  for (const entry of C3_EXTRAS_TO_PRUNE) {
    const path = joinPathFragments(projectRoot, entry);
    if (tree.exists(path)) {
      tree.delete(path);
    }
  }
}

// `wrangler types` output that C3 typically emits during scaffolding. It is the
// `typegen` target's declared Nx output (see plugin.ts), so it is a build
// artifact — never committed, regenerated on demand via `nx typegen`. Prune any
// scaffolded copy (a no-op when the template ships none) and keep it out of
// version control.
const GENERATED_TYPES_FILE = 'worker-configuration.d.ts';

function handleGeneratedTypes(tree: Tree, projectRoot: string): void {
  const path = joinPathFragments(projectRoot, GENERATED_TYPES_FILE);
  if (tree.exists(path)) {
    tree.delete(path);
  }
  ensureGitignored(tree, projectRoot, GENERATED_TYPES_FILE);
}

// Append an entry to the project's `.gitignore` if absent (matching whole
// lines so a substring never masks a real entry). Creates the file when a
// template ships without one. C3 keeps its own ignores; this only adds.
function ensureGitignored(
  tree: Tree,
  projectRoot: string,
  entry: string
): void {
  const path = joinPathFragments(projectRoot, '.gitignore');
  const existing = tree.exists(path) ? tree.read(path, 'utf-8') ?? '' : '';
  const lines = existing.split('\n').map((line) => line.trim());
  if (lines.includes(entry)) {
    return;
  }
  const prefix = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  tree.write(path, `${existing}${prefix}${entry}\n`);
}

// Targets are always inferred from the Wrangler config (createNodes), so a
// written project.json carries metadata only. Skipped by default in the TS
// solution setup, where the package.json is the project's source of truth.
function maybeWriteProjectJson(tree: Tree, options: NormalizedSchema): void {
  if (!options.useProjectJson) {
    return;
  }
  writeJson(tree, joinPathFragments(options.projectRoot, 'project.json'), {
    name: options.projectName,
    $schema: `${joinPathFragments(
      offsetFromRoot(options.projectRoot),
      'node_modules/nx/schemas/project-schema.json'
    )}`,
    projectType: 'application',
    sourceRoot: joinPathFragments(options.projectRoot, 'src'),
    tags: options.parsedTags,
  });
}

// Wrangler commands the createNodes plugin already exposes as inferred
// targets. C3 also adds package.json scripts for them; dropping the scripts
// leaves the inferred targets as the single source of truth. Matched by command
// value so framework scripts (build/preview) — which have no inferred equivalent
// — are kept. The `test` script is dropped separately, but only when @nx/vitest
// is wired to infer it (see ensureVitestTestTarget).
const INFERRED_WRANGLER_COMMANDS = new Set([
  'wrangler deploy',
  'wrangler dev',
  'wrangler types',
  'wrangler versions upload',
  'wrangler tail',
]);

// Align the package identity with Nx: C3 names the package after the temp
// scaffold folder, so rename it; in inference mode (no project.json) the
// package.json also carries the project's tags under its `nx` property. Also
// drops scripts that duplicate inferred Wrangler targets.
function updateProjectPackageJson(tree: Tree, options: NormalizedSchema): void {
  const packageJsonPath = joinPathFragments(
    options.projectRoot,
    'package.json'
  );
  if (!tree.exists(packageJsonPath)) {
    return;
  }
  updateJson(tree, packageJsonPath, (json) => {
    json.name = options.projectName;
    if (!options.useProjectJson && options.parsedTags.length > 0) {
      json.nx = { ...json.nx, tags: options.parsedTags };
    }
    if (json.scripts) {
      for (const [name, command] of Object.entries(json.scripts)) {
        if (
          typeof command === 'string' &&
          INFERRED_WRANGLER_COMMANDS.has(command.trim())
        ) {
          delete json.scripts[name];
        }
      }
    }
    return json;
  });
}

const INFERENCE_PLUGIN = '@naxodev/nx-cloudflare/plugin';

// A createNodes plugin only contributes targets if it's listed in nx.json;
// installing the package doesn't register it. Add it (idempotently, matching
// both the string and object plugin forms) or the inferred targets never appear.
function ensurePluginRegistered(tree: Tree, plugin: string): void {
  const nxJson = readNxJson(tree);
  if (!nxJson) {
    return;
  }
  const plugins = nxJson.plugins ?? [];
  const isRegistered = plugins.some(
    (p) => (typeof p === 'string' ? p : p.plugin) === plugin
  );
  if (!isRegistered) {
    nxJson.plugins = [...plugins, plugin];
    updateNxJson(tree, nxJson);
  }
}

const VITEST_PLUGIN = '@nx/vitest';

// C3's Worker templates ship a vitest setup (vitest.config.mts + a spec), but
// nothing in the workspace turns it into an Nx `test` target. @nx/vitest's
// createNodes infers `test` from a vitest config — so when the scaffold has
// one, register the plugin and add it as a devDependency. Skipped otherwise to
// avoid foisting an unused plugin + dependency on workspaces whose template has
// no vitest config. Note: @nx/vitest exposes createNodes from its package
// root (no `/plugin` subpath in Nx 22).
const VITEST_CONFIG_FILES = [
  'vitest.config.ts',
  'vitest.config.mts',
  'vitest.config.cts',
  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.config.cjs',
];

function ensureVitestTestTarget(tree: Tree, projectRoot: string): void {
  const hasVitestConfig = VITEST_CONFIG_FILES.some((file) =>
    tree.exists(joinPathFragments(projectRoot, file))
  );
  if (!hasVitestConfig) {
    return;
  }
  ensurePluginRegistered(tree, VITEST_PLUGIN);
  addDependenciesToPackageJson(tree, {}, { [VITEST_PLUGIN]: nxVitestVersion });
  dropVitestScript(tree, projectRoot);
}

// The inferred @nx/vitest `test` target is the single source of truth, so a
// script that just invokes vitest duplicates it — drop it. Same reasoning as the
// wrangler-script stripping in updateProjectPackageJson, gated on @nx/vitest
// being wired. Matched by command value, not name, so a non-vitest script (e.g.
// `test: jest`) survives.
function dropVitestScript(tree: Tree, projectRoot: string): void {
  const packageJsonPath = joinPathFragments(projectRoot, 'package.json');
  if (!tree.exists(packageJsonPath)) {
    return;
  }
  updateJson(tree, packageJsonPath, (json) => {
    if (json.scripts) {
      for (const [name, command] of Object.entries(json.scripts)) {
        const cmd = typeof command === 'string' ? command.trim() : '';
        if (cmd === 'vitest' || cmd.startsWith('vitest ')) {
          delete json.scripts[name];
        }
      }
    }
    return json;
  });
}

const WRANGLER_CONFIG_FILES = [
  'wrangler.toml',
  'wrangler.jsonc',
  'wrangler.json',
];

// C3 points the Wrangler config $schema at the project-local `node_modules`,
// which doesn't exist in a monorepo (wrangler is hoisted to the workspace root).
// Retarget it via offsetFromRoot so editors still validate the config. Done as a
// string replace to preserve JSONC comments. No-op for non-relative schemas.
function retargetWranglerSchema(tree: Tree, projectRoot: string): void {
  const offset = offsetFromRoot(projectRoot);
  for (const file of WRANGLER_CONFIG_FILES) {
    const path = joinPathFragments(projectRoot, file);
    const content = tree.exists(path) ? tree.read(path, 'utf-8') : null;
    if (!content) {
      continue;
    }
    const retargeted = content.replace(
      /(\$schema["']?\s*[:=]\s*["'])(?:\.\/)?node_modules\/wrangler\/config-schema\.json/,
      `$1${offset}node_modules/wrangler/config-schema.json`
    );
    if (retargeted !== content) {
      tree.write(path, retargeted);
    }
  }
}

// Targets are inferred from the Wrangler config by the createNodes plugin, so
// a scaffold without one (e.g. a legacy Pages-only template) silently yields a
// project with no Nx targets. Surface that loudly rather than hand back a
// target-less project that looks fine.
function warnIfNoWranglerConfig(tree: Tree, projectRoot: string): void {
  const hasConfig = WRANGLER_CONFIG_FILES.some((file) =>
    tree.exists(joinPathFragments(projectRoot, file))
  );

  if (!hasConfig) {
    logger.warn(
      `create-cloudflare: the template produced no wrangler.jsonc/toml at "${projectRoot}", ` +
        `so this project will have no inferred Nx targets. Choose a Workers template; ` +
        `Pages-only templates are not supported by the inference plugin.`
    );
  }
}

async function normalizeOptions(
  tree: Tree,
  options: Schema
): Promise<NormalizedSchema> {
  await ensureRootProjectName(options, 'application');
  const { projectName, projectRoot } = await determineProjectNameAndRootOptions(
    tree,
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
    projectName,
    projectRoot,
    parsedTags,
    lang: options.lang ?? 'ts',
    c3Version: options.c3Version ?? createCloudflareVersion,
    packageManager: detectPackageManager(tree.root),
    // Default to no project.json: the createNodes plugin registers the worker
    // from its wrangler config + package.json (verified in both the TS solution
    // and legacy setups), so a project.json is redundant. Opt-in for users who
    // still want an explicit one.
    useProjectJson: options.useProjectJson ?? false,
  };
}

export default createCloudflareGenerator;
export const createCloudflareSchematic = convertNxGenerator(
  createCloudflareGenerator
);
