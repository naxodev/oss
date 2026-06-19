import { dirname, join } from 'path';
import { homedir } from 'os';
import { removeSync, mkdirSync } from 'fs-extra';
import { appendFileSync, readFileSync, rmSync } from 'fs';
import { spawnSync, type SpawnSyncOptions } from 'child_process';
import { tmpProjPath } from '@nx/plugin/testing';
import { npmRegistryEnv } from './get-env-info';

// Pin the generated workspace to the Nx version this repo builds against. e2e
// must exercise the plugin's published peerDependency range against a known-
// supported Nx, not whatever `@latest` happens to be on the day CI runs.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nxVersion: string = require('nx/package.json').version;
if (!nxVersion) {
  throw new Error(
    'Could not resolve the Nx version from nx/package.json for e2e workspace pinning.'
  );
}

/**
 * Run a command with an explicit argv and no shell, throwing on non-zero exit
 * to mirror `execSync`'s behaviour. Passing arguments as an array (rather than
 * interpolating them into a shell string) keeps values like the plugin name or
 * Nx version from ever being parsed as shell syntax.
 */
function runCommand(
  command: string,
  args: string[],
  options: SpawnSyncOptions
): void {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `Command failed (exit code ${result.status}): ${command} ${args.join(
        ' '
      )}`
    );
  }
}

/**
 * Deletes the e2e directory
 */
export function cleanup(): void {
  removeSync(dirname(tmpProjPath()));
}

/**
 * Creates a fresh Nx workspace in the e2e tmp dir and installs the given
 * plugin from the local Verdaccio registry (published in jest globalSetup).
 *
 * Unlike `ensureNxProject` — which copies the built `dist` into a fixture and
 * therefore never resolves peerDependencies, package `exports`, or migrations —
 * this exercises the real `create-nx-workspace` + published-tarball install
 * path that consumers actually use.
 *
 * @returns the absolute path of the generated workspace.
 */
export function createTestProject(pluginName: string): string {
  newNxProject();
  installPlugin(pluginName);
  return tmpProjPath();
}

/**
 * Creates a new nx project in the e2e directory
 *
 */
export function newNxProject(): void {
  cleanup();
  mkdirSync(dirname(tmpProjPath()));
  runNxNewCommand();
  pinWorkspaceNxVersion();
}

/**
 * Force every Nx package in the generated workspace to the version this repo
 * builds against.
 *
 * `create-nx-workspace@<v> --preset apps` clones the `nrwl/empty-template`,
 * which pins Nx to `latest` — NOT the requested CLI version. Testing against a
 * newer Nx than the plugin supports (peerDependency `@nx/* ^22`) breaks on
 * internal API drift: e.g. Nx 23 changed `findMatchingConfigFiles`'s signature,
 * so the plugin's `@nx/js` library generator passes a glob into the `include`
 * slot and Nx crashes with "patterns.some is not a function". Pinning to the
 * repo's Nx keeps the e2e on a supported combination.
 */
function pinWorkspaceNxVersion(): void {
  const localTmpDir = tmpProjPath();
  const pkg = JSON.parse(
    readFileSync(join(localTmpDir, 'package.json'), 'utf-8')
  );
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const nxPackages = Object.keys(deps).filter(
    (name) => name === 'nx' || name.startsWith('@nx/')
  );
  if (nxPackages.length === 0) {
    return;
  }
  runCommand(
    'bun',
    ['add', '-d', ...nxPackages.map((name) => `${name}@${nxVersion}`)],
    {
      cwd: localTmpDir,
      env: { ...process.env, ...npmRegistryEnv() },
    }
  );
}

export function installPlugin(pluginName: string) {
  const localTmpDir = join(tmpProjPath());
  // The plugin was published to the local Verdaccio registry in setup. Scope
  // ONLY `@naxodev/*` to that registry via the workspace `.npmrc`; the plugin's
  // own dependency tree resolves from npmjs (the forced default below). This
  // keeps Verdaccio's flaky npmjs uplink out of the hot path — see NPM_REGISTRY.
  //
  // `npm_config_registry` is only set in the registry-owner process, so a
  // non-owner project (e.g. `nx run-many -t e2e` without --parallel=1) falls
  // back to the default port, matching the `local-registry` target in
  // project.json.
  const registry = process.env.npm_config_registry ?? 'http://localhost:4873';
  appendFileSync(
    join(localTmpDir, '.npmrc'),
    `\n@naxodev:registry=${registry}\n`
  );
  // Evict any @naxodev/* tarball bun cached under the fixed e2e version
  // (`0.0.0-e2e`). The version string never changes between runs, so bun
  // happily serves a *stale* plugin from a previous build/session — which
  // surfaces as "Cannot find generator" when a generator was renamed since.
  // CI persists `~/.bun/install/cache`, so this must be busted every run.
  rmSync(join(homedir(), '.bun/install/cache/@naxodev'), {
    recursive: true,
    force: true,
  });
  runCommand('bun', ['add', `@naxodev/${pluginName}@e2e`, '--no-cache'], {
    cwd: localTmpDir,
    env: { ...process.env, ...npmRegistryEnv() },
  });
}

function runNxNewCommand() {
  const localTmpDir = dirname(tmpProjPath());

  runCommand(
    'npx',
    [
      '--yes',
      `create-nx-workspace@${nxVersion}`,
      'proj',
      '--preset',
      'apps',
      '--nxCloud=skip',
      '--no-interactive',
      '--packageManager=bun',
    ],
    {
      cwd: localTmpDir,
      env: {
        ...process.env,
        // Mark the run as automated so create-nx-workspace never opens a
        // browser tab (e.g. the Nx Cloud "connect your workspace" prompt).
        CI: 'true',
        // The e2e workspace lives under this repo's gitignored `tmp/`. Without
        // a ceiling, create-nx-workspace walks up, finds the outer repo, skips
        // its own `git init`, then fails its initial `git add` because `tmp` is
        // ignored. Capping the search makes it init an isolated repo in `proj`.
        GIT_CEILING_DIRECTORIES: localTmpDir,
        // Strip inherited Nx Cloud credentials so `--nxCloud=skip` is honored
        // (a leaked token makes create-nx-workspace configure Cloud anyway,
        // which also pops a "connect your workspace" browser tab) and hard-
        // disable the Cloud runner for every nx invocation in the fixture.
        NX_CLOUD_ACCESS_TOKEN: '',
        NX_CLOUD_ID: '',
        NX_NO_CLOUD: 'true',
        // Resolve the workspace's dependency tree from npmjs directly, not
        // through Verdaccio's uplink proxy (which the registry-owner process
        // points the registry env vars at). See npmRegistryEnv.
        ...npmRegistryEnv(),
      },
    }
  );
  console.log(`Created test project in "${localTmpDir}"`);
}
