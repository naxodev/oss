/**
 * Starts a local registry for e2e testing, safe under concurrent bun-test
 * preload `beforeAll` invocations (see `tools/scripts/e2e-bun-setup.ts`).
 *
 * Multiple e2e projects (gonx-e2e, nx-cloudflare-e2e) share one verdaccio
 * instance (same port + storage). To avoid the race where one project's
 * teardown kills verdaccio while another is still mid-test, we coordinate via
 * per-process lock files:
 *
 * - Every setup writes a `<pid>.lock` file under `tmp/local-registry/locks`
 *   and atomically claims ownership of the registry only if the port is free
 *   at the moment `startLocalRegistry` succeeds. Losers of the port race
 *   become non-owners.
 * - Every teardown deletes its own lock. Non-owner teardowns stop there; the
 *   owner teardown waits for the lock directory to drain (i.e. refcount → 0)
 *   before stopping verdaccio.
 * - On the next setup, any lock whose pid no longer exists is cleared
 *   (cleanup from crashed prior runs).
 */

/// <reference path="registry.d.ts" />

import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';
import { readFileSync, writeFileSync } from 'node:fs';
import { claimRegistry } from '@naxodev/e2e-utils';

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
