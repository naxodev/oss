import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addProjectConfiguration,
  logger,
  readNxJson,
  readProjectConfiguration,
  updateNxJson,
  type ProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import update from './move-to-inference';
import { INFERENCE_PLUGIN } from '../../utils/inference-plugin';
import {
  cloudflareWorkersTypeVersions,
  wranglerVersion,
} from '../../utils/versions';

const INFERENCE_PLUGIN_NAMES = [INFERENCE_PLUGIN];

/** Seed a worker project carrying the executor targets 6.0.0 used to generate. */
function addWorkerProject(
  tree: Tree,
  name: string,
  extraTargets: ProjectConfiguration['targets'] = {}
): void {
  addProjectConfiguration(tree, name, {
    root: `apps/${name}`,
    projectType: 'application',
    targets: {
      serve: { executor: '@naxodev/nx-cloudflare:serve', options: {} },
      deploy: { executor: '@naxodev/nx-cloudflare:deploy', options: {} },
      ...extraTargets,
    },
  });
}

function registeredPlugins(tree: Tree): string[] {
  return (readNxJson(tree)?.plugins ?? []).map((p) =>
    typeof p === 'string' ? p : p.plugin
  );
}

describe('move-to-inference migration', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('strips serve/deploy/publish/next-build executor targets and keeps the rest', async () => {
    addWorkerProject(tree, 'worker', {
      // deploy's `publish` alias and the removed next-build executor.
      publish: { executor: '@naxodev/nx-cloudflare:publish', options: {} },
      'next-build': {
        executor: '@naxodev/nx-cloudflare:next-build',
        options: {},
      },
      // An unrelated target must survive — the migration removes by executor id,
      // not by target name.
      lint: { executor: '@nx/eslint:lint', options: {} },
    });

    await update(tree);

    const targets = readProjectConfiguration(tree, 'worker').targets ?? {};
    expect(targets.serve).toBeUndefined();
    expect(targets.deploy).toBeUndefined();
    expect(targets.publish).toBeUndefined();
    expect(targets['next-build']).toBeUndefined();
    expect(targets.lint).toBeDefined();
  });

  it('registers the inference plugin in nx.json', async () => {
    addWorkerProject(tree, 'worker');

    await update(tree);

    expect(registeredPlugins(tree)).toContain(INFERENCE_PLUGIN);
  });

  it('is idempotent: a second run makes no further changes', async () => {
    addWorkerProject(tree, 'worker', {
      lint: { executor: '@nx/eslint:lint', options: {} },
    });

    await update(tree);
    const afterFirst = readProjectConfiguration(tree, 'worker');
    await update(tree);
    const afterSecond = readProjectConfiguration(tree, 'worker');

    expect(afterSecond).toEqual(afterFirst);
    // No duplicate plugin registration.
    expect(
      registeredPlugins(tree).filter((p) => INFERENCE_PLUGIN_NAMES.includes(p))
    ).toHaveLength(1);
  });

  it('does not duplicate an already-registered plugin', async () => {
    const nxJson = readNxJson(tree) ?? {};
    nxJson.plugins = [INFERENCE_PLUGIN];
    updateNxJson(tree, nxJson);
    addWorkerProject(tree, 'worker');

    await update(tree);

    expect(
      registeredPlugins(tree).filter((p) => INFERENCE_PLUGIN_NAMES.includes(p))
    ).toHaveLength(1);
  });

  it('leaves a project with no nx-cloudflare executor targets untouched', async () => {
    addProjectConfiguration(tree, 'api', {
      root: 'apps/api',
      projectType: 'application',
      targets: { lint: { executor: '@nx/eslint:lint', options: {} } },
    });

    await update(tree);

    const targets = readProjectConfiguration(tree, 'api').targets ?? {};
    expect(Object.keys(targets)).toEqual(['lint']);
  });

  it('warns only for stripped targets that carried custom options', async () => {
    // strip-only drops executor options; a customized target must be surfaced
    // (fail loud) so the consumer re-expresses it in the wrangler config. A
    // target with no options is removed silently.
    const warn = spyOn(logger, 'warn').mockImplementation(() => undefined);
    addProjectConfiguration(tree, 'worker', {
      root: 'apps/worker',
      projectType: 'application',
      targets: {
        serve: {
          executor: '@naxodev/nx-cloudflare:serve',
          options: { port: 1234, ip: '0.0.0.0' },
        },
        deploy: { executor: '@naxodev/nx-cloudflare:deploy', options: {} },
      },
    });

    await update(tree);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('worker:serve'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('port, ip'));
    warn.mockRestore();
  });

  it('keeps packageJsonUpdates versions in sync with versions.ts', () => {
    // The migration's dep bumps are static JSON; guard against them drifting
    // from the single source of truth the generators use.
    const migrations = JSON.parse(
      readFileSync(join(__dirname, '../../../migrations.json'), 'utf-8')
    );
    const packages = migrations.packageJsonUpdates['7.0.0'].packages;
    expect(packages['wrangler'].version).toBe(wranglerVersion);
    expect(packages['@cloudflare/workers-types'].version).toBe(
      cloudflareWorkersTypeVersions
    );
  });
});
