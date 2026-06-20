import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import {
  type CreateNodes,
  type CreateNodesContext,
  type TargetConfiguration,
  createNodesFromFiles,
  logger,
  parseJson,
} from '@nx/devkit';

/** Options to rename the inferred bun unit-test target. */
export interface BunTestPluginOptions {
  /** Name for the inferred `bun test` target. @default 'test' */
  testTargetName?: string;
}

/** Render an unknown thrown value as a concise, log-friendly reason. */
function errorReason(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Build the bun unit-test target. It wraps the per-file isolation runner
 * (`tools/scripts/bun-test.ts`) and supplies the Nx metadata the hand-written
 * target lacked: `cache`, `inputs` (so a no-op re-run hits the local/Cloud
 * cache), and `metadata` for `nx show`.
 */
function buildTestTarget(): TargetConfiguration {
  return {
    command: 'bun {workspaceRoot}/tools/scripts/bun-test.ts',
    options: { cwd: '{projectRoot}' },
    cache: true,
    inputs: ['default', '^production', { externalDependencies: ['bun'] }],
    metadata: {
      technologies: ['bun'],
      description: 'Run unit tests with bun test (per-file isolation)',
    },
  };
}

/**
 * True when the project at `projectRoot` runs its specs through an `e2e` target
 * (e.g. gonx-e2e / nx-cloudflare-e2e) rather than a plain unit `test` target.
 * Those suites carry a `tsconfig.spec.json` too, but their `.spec.ts` files need
 * the Verdaccio preload — a plain `bun test` target would run them with no
 * registry. Reading the sibling project.json is how we tell them apart.
 */
function isE2eProject(workspaceRoot: string, projectRoot: string): boolean {
  const projectJsonPath = join(workspaceRoot, projectRoot, 'project.json');
  if (!existsSync(projectJsonPath)) return false;
  try {
    const config = parseJson(readFileSync(projectJsonPath, 'utf-8'));
    return Boolean(config?.targets?.e2e);
  } catch (e) {
    logger.warn(
      `[bun-test] Could not parse ${projectJsonPath}: ${errorReason(e)}`
    );
    return false;
  }
}

function createNodesInternal(
  configFile: string,
  options: BunTestPluginOptions | undefined,
  context: CreateNodesContext
) {
  const projectRoot = dirname(configFile);

  if (isE2eProject(context.workspaceRoot, projectRoot)) {
    return {};
  }

  const testTargetName = options?.testTargetName ?? 'test';
  return {
    projects: {
      [projectRoot]: { targets: { [testTargetName]: buildTestTarget() } },
    },
  };
}

/**
 * Nx inference plugin. For every `tsconfig.spec.json` (the repo's test marker)
 * whose project is NOT an e2e suite, infers a cacheable bun unit-test target
 * wrapping `tools/scripts/bun-test.ts`. Inference itself is uncached (trivial
 * work; matches `@naxodev/nx-cloudflare` and `@naxodev/gonx`); the emitted
 * target is cacheable.
 */
export const createNodes: CreateNodes<BunTestPluginOptions> = [
  '**/tsconfig.spec.json',
  (configFiles, options, context) =>
    createNodesFromFiles(createNodesInternal, configFiles, options ?? {}, context),
];
