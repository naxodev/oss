import { output } from '@nx/devkit';
import {
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
      // Keep installs off Verdaccio's npmjs uplink — see npmRegistryEnv().
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
        // Keep installs off Verdaccio's npmjs uplink — see npmRegistryEnv().
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
