import { dirname, join } from 'path';
import { removeSync, mkdirSync } from 'fs-extra';
import { execSync } from 'child_process';
import { tmpProjPath } from '@nx/plugin/testing';

function runNxNewCommand(args?: string, silent?: boolean) {
  const localTmpDir = dirname(tmpProjPath());

  execSync(
    `npx --yes create-nx-workspace@latest proj --preset empty --no-nxCloud --no-interactive`,
    {
      cwd: localTmpDir,
      stdio: 'inherit',
      env: process.env,
    }
  );
  console.log(`Created test project in "${localTmpDir}"`);
}

/**
 * Deletes the e2e directory
 */
export function cleanup(): void {
  const localTmpDir = dirname(tmpProjPath());
  console.log('Cleaning up test project', localTmpDir);
  removeSync(dirname(tmpProjPath()));
}

/**
 * Creates a new nx project in the e2e directory
 *
 */
export function newNxProject(): void {
  cleanup();
  mkdirSync(dirname(tmpProjPath()));
  runNxNewCommand('', false);
}

export function installPlugin(pluginName: string) {
  const localTmpDir = join(tmpProjPath());
  // The plugin has been built and published to a local registry in the jest globalSetup
  // Install the plugin built with the latest source code into the test repo
  execSync(`pnpm add @naxodev/${pluginName}@e2e`, {
    cwd: localTmpDir,
    stdio: 'inherit',
    env: process.env,
  });
}
