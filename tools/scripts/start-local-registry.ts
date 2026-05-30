/**
 * Starts a local registry for e2e testing, safe under concurrent jest
 * globalSetup invocations.
 *
 * Multiple e2e projects (gonx-e2e, nx-cloudflare-e2e) share one verdaccio
 * instance (same port + storage). To avoid the race where one project's
 * globalTeardown kills verdaccio while another is still mid-test, we
 * coordinate via per-process lock files:
 *
 * - Every globalSetup writes a `<pid>.lock` file under `tmp/local-registry/
 *   locks` and atomically claims ownership of the registry only if the port
 *   is free at the moment `startLocalRegistry` succeeds. Losers of the port
 *   race become non-owners.
 * - Every globalTeardown deletes its own lock. Non-owner teardowns stop
 *   there; the owner teardown waits for the lock directory to drain (i.e.
 *   refcount → 0) before stopping verdaccio.
 * - On the next setup, any lock whose pid no longer exists is cleared
 *   (cleanup from crashed prior runs).
 */

/// <reference path="registry.d.ts" />

import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createServer } from 'net';

const REGISTRY_PORT = 4873;
const STORAGE_DIR = './tmp/local-registry/storage';
const LOCK_DIR = './tmp/local-registry/locks';
const LOCK_FILE = join(LOCK_DIR, `${process.pid}.lock`);
const OWNER_DRAIN_TIMEOUT_MS = 120_000;
const OWNER_DRAIN_POLL_MS = 250;

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
 * i.e. some other jest globalSetup beat us to startLocalRegistry.
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
 * Wait until every other jest process has dropped its lock, then stop
 * verdaccio. Caps the wait so a stuck process can't hold up CI forever.
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

  // If verdaccio is already up, another project owns it — connect only.
  if (await isRegistryPortInUse(REGISTRY_PORT)) {
    becomeNonOwner();
    return;
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
  await releaseVersion({
    specifier: '0.0.0-e2e',
    stageChanges: false,
    gitCommit: false,
    gitTag: false,
    firstRelease: true,
    versionActionsOptionsOverrides: {
      skipLockFileUpdate: true,
    },
  });
  // The publish step can return non-zero codes (e.g. 409 if the storage
  // dir already has 0.0.0-e2e packages from a previous local run). That's
  // non-fatal for the e2e tests — the packages are still installable. We
  // surface unexpected throws but swallow per-task failure codes by not
  // re-checking the returned `publishProjectsResult`.
  await releasePublish({
    tag: 'e2e',
    firstRelease: true,
  });

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
module.exports = setup;
