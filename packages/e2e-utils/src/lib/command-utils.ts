import { output } from '@nx/devkit';
import {
  ensureCypressInstallation,
  ensurePlaywrightBrowsersInstallation,
  getStrippedEnvironmentVariables,
  isVerboseE2ERun,
  npmRegistryEnv,
} from './get-env-info';
import { ChildProcess, exec, execSync } from 'child_process';
import { logError, stripConsoleColors } from './log-utils';
import { tmpProjPath } from '@nx/plugin/testing';

export interface RunCmdOpts {
  silenceError?: boolean;
  env?: Record<string, string | undefined>;
  cwd?: string;
  silent?: boolean;
  verbose?: boolean;
  redirectStderr?: boolean;
}

export function getPackageManagerCommand(): {
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
  // e2e workspaces are always created with bun (see create-test-project), so
  // every command goes through bun — no package-manager detection needed.
  return {
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
  };
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
          NX_NO_CLOUD: 'true',
          // Default installs (incl. nx-generator- and C3-triggered ones) to
          // npmjs; only @naxodev/* resolves from Verdaccio (scoped in the
          // workspace .npmrc). See npmRegistryEnv.
          ...npmRegistryEnv(),
        },
        encoding: 'utf-8',
      },
      (err, stdout, stderr) => {
        if (!opts.silenceError && err) {
          logError(`Original command: ${command}`, `${stdout}\n\n${stderr}`);
          reject(err);
          return;
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
      NX_NO_CLOUD: 'true',
      // See runCommandAsync — keep installs off Verdaccio's npmjs uplink.
      ...npmRegistryEnv(),
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
        // getStrippedEnvironmentVariables() drops NX_* keys; force the
        // generated workspace's nx commands off Nx Cloud so they use the
        // local task runner (the cloud runner's cache write can fail in a
        // throwaway workspace with no cloud credentials).
        NX_NO_CLOUD: 'true',
        // See runCommandAsync — keep installs off Verdaccio's npmjs uplink.
        ...npmRegistryEnv(),
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

/**
 * Run `nx show project <name> --json` and return the parsed project
 * configuration. Slices from the first brace so a stray banner/progress line
 * ahead of the JSON payload can't make `JSON.parse` throw an opaque error.
 *
 * Note: this does not reset the Nx daemon — call `runCLI('reset')` first if the
 * project was just generated.
 */
export function showProject(
  projectName: string,
  opts?: RunCmdOpts
): {
  root: string;
  targets?: Record<string, { executor?: string; continuous?: boolean }>;
  [key: string]: unknown;
} {
  const out = runCLI(`show project ${projectName} --json`, opts);
  return JSON.parse(out.slice(out.indexOf('{')));
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
