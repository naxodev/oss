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
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { createServer } from 'net';

const REGISTRY_PORT = 4873;
const STORAGE_DIR = './tmp/local-registry/storage';
const LOCK_DIR = './tmp/local-registry/locks';
const LOCK_FILE = join(LOCK_DIR, `${process.pid}.lock`);
const OWNER_DRAIN_TIMEOUT_MS = 120_000;
const OWNER_DRAIN_POLL_MS = 250;
// How long an owner's teardown waits for verdaccio to release the port, and how
// long a successor waits for a draining predecessor's port to free before
// deciding a still-bound port means a genuinely live concurrent peer.
const PORT_RELEASE_TIMEOUT_MS = 30_000;
const PORT_WAIT_TIMEOUT_MS = 10_000;
const PORT_POLL_MS = 100;

/**
 * Remove lock files whose owning process no longer exists. Prevents a
 * crashed prior run from blocking the owner-teardown drain forever.
 */
function cleanStaleLocks(): void {
  if (!existsSync(LOCK_DIR)) return;
  for (const entry of readdirSync(LOCK_DIR)) {
    if (!entry.endsWith('.lock')) continue;
    const pid = Number.parseInt(entry.replace(/\.lock$/, ''), 10);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    try {
      // Signal 0 doesn't kill — just probes whether the pid is alive.
      process.kill(pid, 0);
    } catch {
      // ESRCH (no such process) or EPERM (process exists but owned by
      // another user). Treat both as "this lock can't represent a live
      // jest in our run" and clear it.
      try {
        rmSync(join(LOCK_DIR, entry), { force: true });
      } catch {
        /* ignore — race with another cleanup */
      }
    }
  }
}

/**
 * Detect whether the registry port is already accepting connections —
 * i.e. some other e2e setup beat us to startLocalRegistry.
 */
function isRegistryPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port);
  });
}

/**
 * Poll until the registry port is free, returning whether it freed within the
 * timeout. Used to (a) let an owner's teardown fully release the port before
 * its process exits and (b) let a serial successor tell a peer's port still
 * draining apart from a genuinely live peer.
 */
async function waitForPortFree(
  port: number,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isRegistryPortInUse(port))) return true;
    await new Promise((r) => setTimeout(r, PORT_POLL_MS));
  }
  return !(await isRegistryPortInUse(port));
}

/**
 * Wait until every other e2e process has dropped its lock, stop verdaccio, then
 * wait for the port to actually release. Caps each wait so a stuck process
 * can't hold up CI forever.
 */
async function drainAndStop(stopVerdaccio: () => void): Promise<void> {
  const deadline = Date.now() + OWNER_DRAIN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    let remaining: string[] = [];
    try {
      remaining = readdirSync(LOCK_DIR).filter((f) => f.endsWith('.lock'));
    } catch {
      // LOCK_DIR vanished — treat as drained.
      break;
    }
    if (remaining.length === 0) break;
    await new Promise((r) => setTimeout(r, OWNER_DRAIN_POLL_MS));
  }
  stopVerdaccio();
  // Block until verdaccio releases the port. Under `nx affected -t e2e
  // --parallel=1` the next e2e project starts in a fresh process the moment
  // this one exits; if the port is still bound by the dying verdaccio, that
  // successor mistakes it for a live peer, becomes a non-owner, and then has no
  // registry to install from (`ConnectionRefused` on `bun add @naxodev/*@e2e`).
  await waitForPortFree(REGISTRY_PORT, PORT_RELEASE_TIMEOUT_MS);
}

function becomeNonOwner(): void {
  global.stopLocalRegistry = () => {
    try {
      rmSync(LOCK_FILE, { force: true });
    } catch {
      /* ignore */
    }
  };
}

const setup = async () => {
  mkdirSync(LOCK_DIR, { recursive: true });
  cleanStaleLocks();
  // Claim a slot in the refcount BEFORE deciding ownership so an owner
  // that finishes immediately still sees us.
  writeFileSync(LOCK_FILE, String(process.pid));

  // A bound port may be a live concurrent peer's verdaccio — or a serial
  // predecessor's instance still releasing the port after `nx` moved on to this
  // project. Wait briefly: if the port frees, take ownership; if it stays bound,
  // treat it as a live peer and connect as a non-owner.
  if (await isRegistryPortInUse(REGISTRY_PORT)) {
    const freed = await waitForPortFree(REGISTRY_PORT, PORT_WAIT_TIMEOUT_MS);
    if (!freed) {
      becomeNonOwner();
      return;
    }
  }

  // Try to become the owner. The port-check above is racy with peers, so
  // startLocalRegistry can still throw if a peer won the bind. Fall back
  // to non-owner in that case.
  let stopVerdaccio: () => void;
  try {
    stopVerdaccio = await startLocalRegistry({
      localRegistryTarget: '@naxodev/oss:local-registry',
      storage: STORAGE_DIR,
      verbose: false,
    });
  } catch {
    becomeNonOwner();
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

  global.stopLocalRegistry = async () => {
    try {
      rmSync(LOCK_FILE, { force: true });
    } catch {
      /* ignore */
    }
    await drainAndStop(stopVerdaccio);
  };
};

export default setup;
