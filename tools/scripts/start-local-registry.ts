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

import { execSync, spawn } from 'node:child_process';
import { releasePublish, releaseVersion } from 'nx/release';
import { readFileSync, writeFileSync } from 'node:fs';
import { claimRegistry } from './e2e-registry';

const STORAGE_DIR = './tmp/local-registry/storage';
const LOCAL_REGISTRY_TARGET = '@naxodev/oss:local-registry';
/**
 * Must match the `listenAddress` of the `local-registry` target in the root
 * project.json. The registry is pinned to the IPv4 loopback (not `localhost`)
 * so it binds deterministically in IPv6-less environments.
 */
const LISTEN_ADDRESS = '127.0.0.1';

/**
 * Local replacement for `@nx/js/plugins/jest/local-registry`'s
 * `startLocalRegistry`, differing in two ways that matter for this repo:
 *
 * - The registry child runs under `node` explicitly. This preload executes
 *   under bun, and `child_process.fork` would propagate bun as the child
 *   runtime for `nx run` and, transitively, the verdaccio executor — whose
 *   `detect-port` probe binds the IPv6 wildcard under bun and fails outright
 *   ("Failed to listen at ::") on hosts without IPv6. nx and verdaccio are
 *   node programs; run them under node.
 * - A child exit before the registry address is seen rejects (with the
 *   captured output) instead of resolving with a no-op stop function, so a
 *   failed registry start surfaces here rather than as a confusing
 *   ConnectionRefused during publish/install much later.
 *
 * Resolves to verdaccio's stop function, matching `claimRegistry`'s contract.
 */
function startLocalRegistryUnderNode(): Promise<() => void> {
  return new Promise((resolve, reject) => {
    // `detached` puts nx and the verdaccio it forks in their own process
    // group so teardown can signal the whole tree at once (see the stop
    // function below), rather than relying on nx forwarding SIGTERM to its
    // grandchild. Windows has no POSIX process groups (and e2e is skipped
    // there anyway), so keep the default there.
    const useProcessGroup = process.platform !== 'win32';
    const child = spawn(
      'node',
      [
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require.resolve('nx/bin/nx'),
        'run',
        LOCAL_REGISTRY_TARGET,
        '--location',
        'none',
        '--clear',
        'true',
        '--storage',
        STORAGE_DIR,
      ],
      { stdio: 'pipe', detached: useProcessGroup }
    );

    let output = '';
    let started = false;

    const listener = (data: Buffer) => {
      output += data.toString();
      // Match against the accumulated `output`, not this single chunk: the
      // "http://127.0.0.1:<port>" banner can arrive split across `data`
      // events, which would otherwise yield a NaN port or never match at all
      // (hanging setup until CI times out).
      if (started || !output.includes(`http://${LISTEN_ADDRESS}:`)) {
        return;
      }
      const port = parseInt(
        output.match(new RegExp(`${LISTEN_ADDRESS}:(?<port>\\d+)`))?.groups
          ?.port
      );
      if (Number.isNaN(port)) {
        // Address line seen but the port digits haven't fully arrived yet;
        // wait for the next chunk to complete the match.
        return;
      }
      const registry = `http://${LISTEN_ADDRESS}:${port}`;
      const authToken = 'secretVerdaccioToken';
      started = true;
      console.log(`Local registry started on ${registry}`);
      process.env.npm_config_registry = registry;
      execSync(
        `npm config set //${LISTEN_ADDRESS}:${port}/:_authToken "${authToken}" --ws=false`,
        { windowsHide: true }
      );
      // bun
      process.env.BUN_CONFIG_REGISTRY = registry;
      process.env.BUN_CONFIG_TOKEN = authToken;
      // yarnv1
      process.env.YARN_REGISTRY = registry;
      // yarnv2
      process.env.YARN_NPM_REGISTRY_SERVER = registry;
      process.env.YARN_UNSAFE_HTTP_WHITELIST = LISTEN_ADDRESS;
      resolve(() => {
        // Tear down the whole process group (nx + the verdaccio it forked)
        // rather than just the nx child. Signalling `-pid` reaches every
        // process in the group, so verdaccio can't be orphaned holding the
        // port when nx doesn't forward SIGTERM to it. Fall back to a direct
        // kill if the group is already gone or process groups are unavailable.
        try {
          if (useProcessGroup && child.pid) {
            process.kill(-child.pid, 'SIGTERM');
          } else {
            child.kill();
          }
        } catch {
          child.kill();
        }
        execSync(
          `npm config delete //${LISTEN_ADDRESS}:${port}/:_authToken --ws=false`,
          { windowsHide: true }
        );
      });
      child.stdout?.off('data', listener);
    };

    child.stdout?.on('data', listener);
    child.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
      // Stream verdaccio's stderr through in real time (matching the upstream
      // startLocalRegistry). Without this a crash after the address line
      // prints produces zero output, surfacing much later as an opaque
      // ConnectionRefused with the root-cause stderr swallowed.
      process.stderr.write(data);
    });
    child.on('error', (err) => reject(err));
    child.on('exit', (code) => {
      if (!started) {
        reject(
          new Error(
            `Local registry process exited with code ${code} before the ` +
              `registry came up. Output:\n${output}`
          )
        );
      }
    });
  });
}

const setup = async () => {
  const claim = await claimRegistry(() => startLocalRegistryUnderNode());

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
