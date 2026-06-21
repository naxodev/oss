/**
 * Owner's post-claim work for the shared local registry, run from the bun-test
 * e2e preload (`tools/scripts/e2e-bun-setup.ts`).
 *
 * The cross-process coordination that lets gonx-e2e and nx-cloudflare-e2e share
 * one verdaccio instance (per-pid lock files, owner election, refcount drain,
 * port handoff) lives in `e2e-registry.ts` (`claimRegistry`). This module is the
 * owner half: once it wins the claim it versions + publishes the plugins at
 * `0.0.0-e2e`, snapshots/restores the on-disk `package.json` files, and wires
 * `global.stopLocalRegistry` to the claim's refcounted teardown.
 */

/// <reference path="registry.d.ts" />

import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';
import { readFileSync, writeFileSync } from 'node:fs';
import { claimRegistry } from './e2e-registry';

const STORAGE_DIR = './tmp/local-registry/storage';

const setup = async () => {
  const claim = await claimRegistry(() =>
    startLocalRegistry({
      localRegistryTarget: '@naxodev/oss:local-registry',
      storage: STORAGE_DIR,
      verbose: false,
    })
  );

  if (!claim.isOwner) {
    global.stopLocalRegistry = () => claim.release();
    return;
  }

  // We own the registry — version & publish, then arrange a refcounted
  // teardown.
  //
  // `releaseVersion` writes `0.0.0-e2e` into each release project's
  // package.json ON DISK (even with stageChanges:false). Snapshot the
  // originals and restore them after publishing so a local `nx e2e` run never
  // leaves a dirty working tree — committing the bumped versions by accident
  // would poison the next real `nx release`.
  const releasePackageJsons = [
    'packages/gonx/package.json',
    'packages/nx-cloudflare/package.json',
  ];
  const originalPackageJsons = new Map(
    releasePackageJsons.map((path) => [path, readFileSync(path, 'utf-8')])
  );
  try {
    await releaseVersion({
      specifier: '0.0.0-e2e',
      stageChanges: false,
      gitCommit: false,
      gitTag: false,
      // nx.json sets release.git.push:true for manual production releases;
      // the local e2e publish must never push (CI runs detached-HEAD).
      gitPush: false,
      firstRelease: true,
      versionActionsOptionsOverrides: {
        skipLockFileUpdate: true,
      },
    });
    // A non-zero per-project code is expected and non-fatal when the storage
    // dir already holds 0.0.0-e2e from a previous local run (verdaccio 409) —
    // the packages stay installable. Warn on any non-zero code rather than
    // discarding the result entirely, so a genuine publish failure (auth,
    // write, corrupt tarball) surfaces here instead of as a confusing
    // `bun add @naxodev/...@e2e` install error much later.
    const publishResult = await releasePublish({
      tag: 'e2e',
      firstRelease: true,
    });
    const nonZero = Object.entries(publishResult ?? {}).filter(
      ([, result]) => (result as { code?: number })?.code
    );
    if (nonZero.length > 0) {
      console.warn(
        'Local registry publish reported non-zero codes (expected on re-runs ' +
          'where 0.0.0-e2e already exists): ' +
          nonZero
            .map(([name, r]) => `${name}=${(r as { code?: number }).code}`)
            .join(', ')
      );
    }
  } finally {
    for (const [path, contents] of originalPackageJsons) {
      writeFileSync(path, contents);
    }
  }

  global.stopLocalRegistry = () => claim.release();
};

export default setup;
