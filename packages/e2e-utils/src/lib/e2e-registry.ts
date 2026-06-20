import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { check, waitUntilFree } from 'tcp-port-used';

const REGISTRY_PORT = 4873;
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
 * Detect whether the registry port is already accepting connections — i.e. some
 * other e2e setup beat us to startLocalRegistry.
 */
function isRegistryPortInUse(port: number): Promise<boolean> {
  return check(port, '127.0.0.1');
}

/**
 * Poll until the registry port is free, returning whether it freed within the
 * timeout. `tcp-port-used` rejects on timeout; we map that back to the boolean
 * contract the callers (owner drain + serial-successor handoff) rely on.
 */
async function waitForPortFree(
  port: number,
  timeoutMs: number
): Promise<boolean> {
  try {
    await waitUntilFree(port, PORT_POLL_MS, timeoutMs);
    return true;
  } catch {
    return false;
  }
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

export interface RegistryClaim {
  /** True when this process started verdaccio and owns its lifecycle. */
  isOwner: boolean;
  /**
   * Teardown. Owner: drop own lock, wait for peers' locks to drain (refcount
   * → 0), stop verdaccio, wait for the port to release. Non-owner: drop own
   * lock and resolve immediately.
   */
  release(): Promise<void>;
}

/**
 * Claim a slot in the shared-registry refcount, then try to become the owner
 * by starting verdaccio via `startVerdaccio`. If the port is already held by a
 * live peer (or the start races and loses), become a non-owner that just
 * connects to the existing registry. `startVerdaccio` is the caller's
 * `startLocalRegistry(...)` thunk; it resolves to verdaccio's stop function.
 */
export async function claimRegistry(
  startVerdaccio: () => Promise<() => void>
): Promise<RegistryClaim> {
  mkdirSync(LOCK_DIR, { recursive: true });
  cleanStaleLocks();
  // Claim a slot in the refcount BEFORE deciding ownership so an owner that
  // finishes immediately still sees us.
  writeFileSync(LOCK_FILE, String(process.pid));

  const dropLock = () => {
    try {
      rmSync(LOCK_FILE, { force: true });
    } catch {
      /* ignore */
    }
  };
  const nonOwner = (): RegistryClaim => ({
    isOwner: false,
    release: async () => dropLock(),
  });

  // A bound port may be a live concurrent peer's verdaccio — or a serial
  // predecessor's instance still releasing the port. Wait briefly: if it frees,
  // take ownership; if it stays bound, connect as a non-owner.
  if (await isRegistryPortInUse(REGISTRY_PORT)) {
    const freed = await waitForPortFree(REGISTRY_PORT, PORT_WAIT_TIMEOUT_MS);
    if (!freed) return nonOwner();
  }

  let stopVerdaccio: () => void;
  try {
    stopVerdaccio = await startVerdaccio();
  } catch {
    return nonOwner();
  }

  return {
    isOwner: true,
    release: async () => {
      dropLock();
      await drainAndStop(stopVerdaccio);
    },
  };
}
