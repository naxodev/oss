import { output, PackageManager } from '@nx/devkit';
import {
  detectPackageManager,
  ensureCypressInstallation,
  ensurePlaywrightBrowsersInstallation,
  getNpmMajorVersion,
  getPnpmVersion,
  getPublishedVersion,
  getStrippedEnvironmentVariables,
  getYarnMajorVersion,
  isVerboseE2ERun,
} from './get-env-info';
import { ChildProcess, exec, execSync } from 'child_process';
import { join } from 'path';
import { logError, stripConsoleColors } from './log-utils';
import { existsSync } from 'fs-extra';
import { gte } from 'semver';
import { fileExists, readJson, tmpProjPath } from '@nx/plugin/testing';

export interface RunCmdOpts {
  silenceError?: boolean;
  env?: Record<string, string | undefined>;
  cwd?: string;
  silent?: boolean;
  verbose?: boolean;
  redirectStderr?: boolean;
}

export function getPackageManagerCommand({
  path = tmpProjPath(),
  packageManager = detectPackageManager(path),
} = {}): {
  createWorkspace: string;
  run: (script: string, args: string) => string;
  runNx: string;
  runNxSilent: string;
  runUninstalledPackage: string;
  install: string;
  ciInstall: string;
  addProd: string;
  addDev: string;
  list: string;
  runLerna: string;
  exec: string;
} {
  const npmMajorVersion = getNpmMajorVersion();
  const yarnMajorVersion = getYarnMajorVersion(path);
  const pnpmVersion = getPnpmVersion();
  const publishedVersion = getPublishedVersion();
  const isYarnWorkspace = fileExists(join(path, 'package.json'))
    ? readJson('package.json').workspaces
    : false;
  const isPnpmWorkspace = existsSync(join(path, 'pnpm-workspace.yaml'));

  return {
    npm: {
      createWorkspace: `npx ${
        npmMajorVersion && +npmMajorVersion >= 7 ? '--yes' : ''
      } create-nx-workspace@${publishedVersion}`,
      run: (script: string, args: string) => `npm run ${script} -- ${args}`,
      runNx: `npx nx`,
      runNxSilent: `npx nx`,
      runUninstalledPackage: `npx --yes`,
      install: 'npm install',
      ciInstall: 'npm ci',
      addProd: `npm install --legacy-peer-deps`,
      addDev: `npm install --legacy-peer-deps -D`,
      list: 'npm ls --depth 10',
      runLerna: `npx lerna`,
      exec: 'npx',
    },
    yarn: {
      createWorkspace: `npx ${
        npmMajorVersion && +npmMajorVersion >= 7 ? '--yes' : ''
      } create-nx-workspace@${publishedVersion}`,
      run: (script: string, args: string) => `yarn ${script} ${args}`,
      runNx: `yarn nx`,
      runNxSilent:
        yarnMajorVersion && +yarnMajorVersion >= 2
          ? 'yarn nx'
          : `yarn --silent nx`,
      runUninstalledPackage: 'npx --yes',
      install: 'yarn',
      ciInstall: 'yarn --frozen-lockfile',
      addProd: isYarnWorkspace ? 'yarn add -W' : 'yarn add',
      addDev: isYarnWorkspace ? 'yarn add -DW' : 'yarn add -D',
      list: 'yarn list --pattern',
      runLerna:
        yarnMajorVersion && +yarnMajorVersion >= 2
          ? 'yarn lerna'
          : `yarn --silent lerna`,
      exec: 'yarn',
    },
    // Pnpm 3.5+ adds nx to
    pnpm: {
      createWorkspace: `pnpm dlx create-nx-workspace@${publishedVersion}`,
      run: (script: string, args: string) => `pnpm run ${script} -- ${args}`,
      runNx: `pnpm exec nx`,
      runNxSilent: `pnpm exec nx`,
      runUninstalledPackage: 'pnpm dlx',
      // We need to install with --no-frozen-lockfile when running e2e tests because pnpm will pick up the fact we are in CI and default to --frozen-lockfile
      install: 'pnpm install --no-frozen-lockfile',
      ciInstall: 'pnpm install --frozen-lockfile',
      addProd: isPnpmWorkspace ? 'pnpm add -w' : 'pnpm add',
      addDev: isPnpmWorkspace ? 'pnpm add -Dw' : 'pnpm add -D',
      list: 'pnpm ls --depth 10',
      runLerna: `pnpm exec lerna`,
      exec: pnpmVersion && gte(pnpmVersion, '6.13.0') ? 'pnpm exec' : 'pnpx',
    },
    bun: {
      // See note in runCreateWorkspace in create-project-utils.ts for why we don't set @{version} for `bunx create-nx-workspace` right now
      createWorkspace: `bunx create-nx-workspace`,
      run: (script: string, args: string) => `bun run ${script} -- ${args}`,
      runNx: `bunx nx`,
      runNxSilent: `bunx nx`,
      runUninstalledPackage: `bunx --yes`,
      install: 'bun install',
      ciInstall: 'bun install --no-cache',
      addProd: 'bun install',
      addDev: 'bun install -D',
      list: 'bun pm ls',
      runLerna: `bunx lerna`,
      exec: 'bun',
    },
  }[packageManager.trim() as PackageManager];
}

export function runE2ETests(runner?: 'cypress' | 'playwright') {
  if (process.env.NX_E2E_RUN_E2E === 'true') {
    if (!runner || runner === 'cypress') {
      ensureCypressInstallation();
    }
    if (!runner || runner === 'playwright') {
      ensurePlaywrightBrowsersInstallation();
    }
    return true;
  }

  console.warn(
    'Not running E2E tests because NX_E2E_RUN_E2E is not set to true.'
  );

  if (process.env.NX_E2E_RUN_CYPRESS) {
    console.warn(
      'NX_E2E_RUN_CYPRESS is deprecated, use NX_E2E_RUN_E2E instead.'
    );
  }

  return false;
}

export function runCommandAsync(
  command: string,
  opts: RunCmdOpts = {
    silenceError: false,
    env: process['env'],
  }
): Promise<{ stdout: string; stderr: string; combinedOutput: string }> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd: opts.cwd || tmpProjPath(),
        env: {
          CI: 'true',
          // Use new versioning by default in e2e tests
          NX_INTERNAL_USE_LEGACY_VERSIONING: 'false',
          ...(opts.env || getStrippedEnvironmentVariables()),
          FORCE_COLOR: 'false',
        },
        encoding: 'utf-8',
      },
      (err, stdout, stderr) => {
        if (!opts.silenceError && err) {
          logError(`Original command: ${command}`, `${stdout}\n\n${stderr}`);
          reject(err);
        }

        const outputs = {
          stdout: stripConsoleColors(stdout),
          stderr: stripConsoleColors(stderr),
          combinedOutput: stripConsoleColors(`${stdout}${stderr}`),
        };

        if (opts.verbose ?? isVerboseE2ERun()) {
          output.log({
            title: `Original command: ${command}`,
            bodyLines: [outputs.combinedOutput],
            color: 'green',
          });
        }

        resolve(outputs);
      }
    );
  });
}

export function runCommandUntil(
  command: string,
  criteria: (output: string) => boolean,
  opts: RunCmdOpts = {
    env: undefined,
  }
): Promise<ChildProcess> {
  const pm = getPackageManagerCommand();
  const p = exec(`${pm.runNx} ${command}`, {
    cwd: tmpProjPath(),
    encoding: 'utf-8',
    env: {
      CI: 'true',
      // Use new versioning by default in e2e tests
      NX_INTERNAL_USE_LEGACY_VERSIONING: 'false',
      ...getStrippedEnvironmentVariables(),
      ...opts.env,
      FORCE_COLOR: 'false',
    },
    windowsHide: false,
  });
  return new Promise((res, rej) => {
    let output = '';
    let complete = false;

    function checkCriteria(c: any) {
      output += c.toString();
      if (criteria(stripConsoleColors(output)) && !complete) {
        complete = true;
        res(p);
      }
    }

    p.stdout?.on('data', checkCriteria);
    p.stderr?.on('data', checkCriteria);
    p.on('exit', (code) => {
      if (!complete) {
        logError(
          `Original output:`,
          output
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n')
        );
        rej(`Exited with ${code}`);
      } else {
        res(p);
      }
    });
  });
}

export function runCLIAsync(
  command: string,
  opts: RunCmdOpts = {
    silenceError: false,
    env: getStrippedEnvironmentVariables(),
    silent: false,
  }
): Promise<{ stdout: string; stderr: string; combinedOutput: string }> {
  const pm = getPackageManagerCommand();
  const commandToRun = `${opts.silent ? pm.runNxSilent : pm.runNx} ${command} ${
    opts.verbose ?? isVerboseE2ERun() ? ' --verbose' : ''
  }${opts.redirectStderr ? ' 2>&1' : ''}`;

  return runCommandAsync(commandToRun, opts);
}

export function runCLI(
  command: string,
  opts: RunCmdOpts = {
    silenceError: false,
    env: undefined,
    verbose: undefined,
    redirectStderr: undefined,
  }
): string {
  try {
    const pm = getPackageManagerCommand();
    const commandToRun = `${pm.runNxSilent} ${command} ${
      opts.verbose ?? isVerboseE2ERun() ? ' --verbose' : ''
    }${opts.redirectStderr ? ' 2>&1' : ''}`;
    const logs = execSync(commandToRun, {
      cwd: opts.cwd || tmpProjPath(),
      env: {
        CI: 'true',
        // Use new versioning by default in e2e tests
        NX_INTERNAL_USE_LEGACY_VERSIONING: 'false',
        ...getStrippedEnvironmentVariables(),
        ...opts.env,
      },
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024,
    });

    if (opts.verbose ?? isVerboseE2ERun()) {
      output.log({
        title: `Original command: ${command}`,
        bodyLines: [logs as string],
        color: 'green',
      });
    }

    const r = stripConsoleColors(logs);

    return r;
  } catch (e: any) {
    if (opts.silenceError) {
      return stripConsoleColors(e.stdout + e.stderr);
    } else {
      logError(`Original command: ${command}`, `${e.stdout}\n\n${e.stderr}`);
      throw e;
    }
  }
}

export function runLernaCLI(
  command: string,
  opts: RunCmdOpts = {
    silenceError: false,
    env: undefined,
  }
): string {
  try {
    const pm = getPackageManagerCommand();
    const fullCommand = `${pm.runLerna} ${command}`;
    const logs = execSync(fullCommand, {
      cwd: opts.cwd || tmpProjPath(),
      env: {
        CI: 'true',
        ...(opts.env || getStrippedEnvironmentVariables()),
      },
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024,
    });

    if (opts.verbose ?? isVerboseE2ERun()) {
      output.log({
        title: `Original command: ${fullCommand}`,
        bodyLines: [logs as string],
        color: 'green',
      });
    }
    const r = stripConsoleColors(logs);

    return r;
  } catch (e: any) {
    if (opts.silenceError) {
      return stripConsoleColors(e.stdout + e.stderr);
    } else {
      logError(`Original command: ${command}`, `${e.stdout}\n\n${e.stderr}`);
      throw e;
    }
  }
}

export function waitUntil(
  predicate: () => boolean,
  opts: { timeout: number; ms: number; allowError?: boolean } = {
    timeout: 5000,
    ms: 50,
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const run = () => {};
      try {
        run();
        if (predicate()) {
          clearInterval(t);
          resolve();
        }
      } catch (e) {
        if (opts.allowError) reject(e);
      }
    }, opts.ms);

    setTimeout(() => {
      clearInterval(t);
      reject(new Error(`Timed out waiting for condition to return true`));
    }, opts.timeout);
  });
}
