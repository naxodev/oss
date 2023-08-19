import { fileExists, readJson, tmpProjPath } from '@nx/plugin/testing';
import { ChildProcess, exec, execSync } from 'child_process';
import { logError, stripConsoleColors } from './log-utils';
import { existsSync } from 'fs-extra';
import { join } from 'path';
import { PackageManager } from 'nx/src/devkit-exports';

export function runCommandUntil(
  command: string,
  criteria: (output: string) => boolean
): Promise<ChildProcess> {
  const pm = getPackageManagerCommand();
  const p = exec(`${pm.runNx} ${command}`, {
    cwd: tmpProjPath(),
    encoding: 'utf-8',
    env: {
      CI: 'true',
      ...getStrippedEnvironmentVariables(),
      FORCE_COLOR: 'false',
    },
  });
  return new Promise((res, rej) => {
    let output = '';
    let complete = false;

    function checkCriteria(c) {
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

export function getStrippedEnvironmentVariables() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => {
      if (key.startsWith('NX_E2E_')) {
        return true;
      }

      if (key.startsWith('NX_')) {
        return false;
      }

      if (key === 'JEST_WORKER_ID') {
        return false;
      }

      return true;
    })
  );
}

export function getPackageManagerCommand({
  path = tmpProjPath(),
  packageManager = detectPackageManager(path),
} = {}): {
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
} {
  const yarnMajorVersion = getYarnMajorVersion(path);
  const isYarnWorkspace = fileExists(join(path, 'package.json'))
    ? readJson('package.json').workspaces
    : false;
  const isPnpmWorkspace = existsSync(join(path, 'pnpm-workspace.yaml'));

  return {
    npm: {
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
    },
    yarn: {
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
    },
    // Pnpm 3.5+ adds nx to
    pnpm: {
      run: (script: string, args: string) => `pnpm run ${script} -- ${args}`,
      runNx: `pnpm exec nx`,
      runNxSilent: `pnpm exec nx`,
      runUninstalledPackage: 'pnpm dlx',
      install: 'pnpm i',
      ciInstall: 'pnpm install --frozen-lockfile',
      addProd: isPnpmWorkspace ? 'pnpm add -w' : 'pnpm add',
      addDev: isPnpmWorkspace ? 'pnpm add -Dw' : 'pnpm add -D',
      list: 'pnpm ls --depth 10',
      runLerna: `pnpm exec lerna`,
    },
  }[packageManager.trim() as PackageManager];
}

export function detectPackageManager(dir: string = ''): PackageManager {
  return existsSync(join(dir, 'yarn.lock'))
    ? 'yarn'
    : existsSync(join(dir, 'pnpm-lock.yaml')) ||
      existsSync(join(dir, 'pnpm-workspace.yaml'))
    ? 'pnpm'
    : 'npm';
}

export function getNpmMajorVersion(): string | undefined {
  try {
    const [npmMajorVersion] = execSync(`npm -v`).toString().split('.');
    return npmMajorVersion;
  } catch {
    return undefined;
  }
}

export function getYarnMajorVersion(path: string): string | undefined {
  try {
    // this fails if path is not yet created
    const [yarnMajorVersion] = execSync(`yarn -v`, {
      cwd: path,
      encoding: 'utf-8',
    }).split('.');
    return yarnMajorVersion;
  } catch {
    try {
      const [yarnMajorVersion] = execSync(`yarn -v`, {
        encoding: 'utf-8',
      }).split('.');
      return yarnMajorVersion;
    } catch {
      return undefined;
    }
  }
}
