import { dirname, join } from 'path';
import { removeSync, mkdirSync } from 'fs-extra';
import { execSync } from 'child_process';
import { tmpProjPath } from '@nx/plugin/testing';

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
}

export function installPlugin(pluginName: string) {
  const localTmpDir = join(tmpProjPath());
  // The plugin was published to the local Verdaccio registry in the jest
  // globalSetup. Pin the install to that registry explicitly: `npm_config_registry`
  // is only set in the registry-owner process, so without this a non-owner
  // project (e.g. `nx run-many -t e2e` without --parallel=1) would resolve the
  // `@e2e` tag against npmjs — where it does not exist — and fail confusingly.
  // The default matches the `local-registry` target's port in project.json.
  const registry = process.env.npm_config_registry ?? 'http://localhost:4873';
  execSync(`pnpm add @naxodev/${pluginName}@e2e --registry=${registry}`, {
    cwd: localTmpDir,
    stdio: 'inherit',
    env: process.env,
  });
}

function runNxNewCommand() {
  const localTmpDir = dirname(tmpProjPath());

  execSync(
    `npx --yes create-nx-workspace@${nxVersion} proj --preset apps --nxCloud=skip --no-interactive --packageManager=pnpm`,
    {
      cwd: localTmpDir,
      stdio: 'inherit',
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
      },
    }
  );
  console.log(`Created test project in "${localTmpDir}"`);
}
