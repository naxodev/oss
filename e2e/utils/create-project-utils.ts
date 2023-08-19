import { copySync, moveSync, removeSync } from 'fs-extra';
import { directoryExists, tmpBackupProjPath, updateFile } from './file-utils';
import { isVerbose } from './get-env-info';
import * as isCI from 'is-ci';

import { execSync } from 'child_process';

import { logError, logInfo } from './log-utils';
import { getPackageManagerCommand, runCLI, RunCmdOpts } from './command-utils';
import { output } from '@nx/devkit';

let projName: string;

/**
 * Sets up a new project in the temporary project path
 * for the currently selected CLI.
 */

// pnpm v7 sadly doesn't automatically install peer dependencies
export function addPnpmRc() {
  updateFile(
    '.npmrc',
    'strict-peer-dependencies=false\nauto-install-peers=true'
  );
}

export function runCreateWorkspace(
  name: string,
  {
    preset,
    appName,
    cwd = 'temp',
  }: {
    preset: string;
    appName?: string;
    cwd?: string;
  }
) {
  projName = name;

  const pm = getPackageManagerCommand();

  let command = `${pm.createWorkspace} ${name} --preset=${preset} --no-nxCloud --no-interactive`;
  if (appName) {
    command += ` --appName=${appName}`;
  }

  if (isCI) {
    command += ` --verbose`;
  }

  try {
    const create = execSync(`${command}${isVerbose() ? ' --verbose' : ''}`, {
      cwd,
      stdio: 'pipe',
      env: {
        CI: 'true',
        NX_VERBOSE_LOGGING: isCI ? 'true' : 'false',
        ...process.env,
      },
      encoding: 'utf-8',
    });

    if (isVerbose()) {
      output.log({
        title: `Command: ${command}`,
        bodyLines: [create as string],
        color: 'green',
      });
    }

    return create;
  } catch (e) {
    logError(`Original command: ${command}`, `${e.stdout}\n\n${e.stderr}`);
    throw e;
  }
}

export function packageInstall(
  pkg: string,
  projName?: string,
  version = 'e2e',
  mode: 'dev' | 'prod' = 'dev'
) {
  const cwd = projName ? `temp/${projName}` : tmpProjPath();
  const pm = getPackageManagerCommand();
  const pkgsWithVersions = pkg
    .split(' ')
    .map((pgk) => `${pgk}@${version}`)
    .join(' ');

  const command = `${
    mode === 'dev' ? pm.addDev : pm.addProd
  } ${pkgsWithVersions}`;

  try {
    const install = execSync(command, {
      cwd,
      stdio: isVerbose() ? 'inherit' : 'ignore',
      env: process.env,
      encoding: 'utf-8',
    });

    if (isVerbose()) {
      output.log({
        title: `Command: ${command}`,
        bodyLines: [install as string],
        color: 'green',
      });
    }

    return install;
  } catch (e) {
    logError(`Original command: ${command}`, `${e.stdout}\n\n${e.stderr}`);
    throw e;
  }
}

export function getProjectName(): string {
  return projName;
}

export function tmpProjPath(path?: string) {
  return path ? `temp/${projName}/${path}` : `temp/${projName}`;
}

export function uniq(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 10000000)}`;
}

// Useful in order to cleanup space during CI to prevent `No space left on device` exceptions
export function cleanupProject({
  skipReset,
  ...opts
}: RunCmdOpts & { skipReset?: boolean } = {}) {
  if (isCI) {
    // Stopping the daemon is not required for tests to pass, but it cleans up background processes
    try {
      if (!skipReset) {
        runCLI('reset', opts);
      }
    } catch {} // ignore crashed daemon
    try {
      removeSync(tmpProjPath());
    } catch {}
  }
}
