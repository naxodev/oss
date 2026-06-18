import { existsSync } from 'fs-extra';
import { execSync } from 'node:child_process';
import { join } from 'path';
import { gte } from 'semver';

import { PackageManager } from 'nx/src/utils/package-manager';
import { e2eConsoleLogger } from './log-utils';
import { tmpProjPath } from '@nx/plugin/testing';

/**
 * The public npm registry.
 *
 * e2e workspaces resolve their entire dependency tree from npmjs and use the
 * shared local Verdaccio registry ONLY for the workspace's own `@naxodev/*`
 * plugins (scoped via the generated workspace's `.npmrc`). Routing the full
 * transitive tree through Verdaccio's npmjs *uplink* makes a cold cache plus
 * bun's high-concurrency install burst hammer npmjs anonymously and hit
 * rate-limit 404s — which surfaces as flaky `create-nx-workspace` failures.
 * Every e2e command that may install packages forces this as the default
 * registry so only the small `@naxodev/*` scope ever touches Verdaccio.
 */
export const NPM_REGISTRY = 'https://registry.npmjs.org/';

/**
 * Environment overrides that force the default package registry back to npmjs
 * for an e2e command.
 *
 * `@nx/js`'s `startLocalRegistry` points the whole process at Verdaccio by
 * setting `npm_config_registry`, `BUN_CONFIG_REGISTRY`, `BUN_CONFIG_TOKEN`, and
 * the yarn equivalents. bun's installer prefers `BUN_CONFIG_REGISTRY` over
 * `npm_config_registry`, so overriding only the latter is not enough — both
 * must be reset. We also drop the Verdaccio auth token so it isn't sent to
 * npmjs (the local registry serves `@naxodev/*` anonymously via `$all`).
 *
 * `@naxodev/*` is kept on Verdaccio by a scoped entry in the generated
 * workspace's `.npmrc`, which is independent of this default. See NPM_REGISTRY.
 */
export function npmRegistryEnv(): Record<string, string | undefined> {
  return {
    npm_config_registry: NPM_REGISTRY,
    BUN_CONFIG_REGISTRY: NPM_REGISTRY,
    BUN_CONFIG_TOKEN: undefined,
  };
}

export function getPublishedVersion(): string {
  process.env.PUBLISHED_VERSION =
    process.env.PUBLISHED_VERSION ||
    // fallback to latest if built nx package is missing
    'latest';
  return process.env.PUBLISHED_VERSION as string;
}

export function detectPackageManager(dir = ''): PackageManager {
  return existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))
    ? 'bun'
    : existsSync(join(dir, 'yarn.lock'))
    ? 'yarn'
    : existsSync(join(dir, 'pnpm-lock.yaml')) ||
      existsSync(join(dir, 'pnpm-workspace.yaml'))
    ? 'pnpm'
    : 'npm';
}

export function isOSX() {
  return process.platform === 'darwin';
}

export function isVerbose() {
  return (
    process.env.NX_VERBOSE_LOGGING === 'true' ||
    process.argv.includes('--verbose')
  );
}

export function isVerboseE2ERun() {
  return process.env.NX_E2E_VERBOSE_LOGGING === 'true' || isVerbose();
}

export function getSelectedPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  return (process.env.SELECTED_PM as 'npm' | 'yarn' | 'pnpm' | 'bun') || 'npm';
}

export function getLatestLernaVersion(): string {
  const lernaVersion = execSync(`npm view lerna version`, {
    encoding: 'utf-8',
  }).trim();
  return lernaVersion;
}

export const packageManagerLockFile = {
  npm: 'package-lock.json',
  yarn: 'yarn.lock',
  pnpm: 'pnpm-lock.yaml',
  bun: (() => {
    try {
      // In version 1.2.0, bun switched to a text based lockfile format by default
      return gte(execSync('bun --version').toString().trim(), '1.2.0')
        ? 'bun.lock'
        : 'bun.lockb';
    } catch {
      return 'bun.lockb';
    }
  })(),
};

export function ensureCypressInstallation() {
  let cypressVerified = true;
  try {
    const r = execSync('npx cypress verify', {
      stdio: isVerbose() ? 'inherit' : 'pipe',
      encoding: 'utf-8',
      cwd: tmpProjPath(),
    });
    if (r.indexOf('Verified Cypress!') === -1) {
      cypressVerified = false;
    }
  } catch {
    cypressVerified = false;
  } finally {
    if (!cypressVerified) {
      e2eConsoleLogger('Cypress was not verified. Installing Cypress now.');
      execSync('npx cypress install', {
        stdio: isVerbose() ? 'inherit' : 'pipe',
        encoding: 'utf-8',
        cwd: tmpProjPath(),
      });
    }
  }
}

export function ensurePlaywrightBrowsersInstallation() {
  const playwrightInstallArgs =
    process.env.PLAYWRIGHT_INSTALL_ARGS || '--with-deps';
  execSync(`npx playwright install ${playwrightInstallArgs}`, {
    stdio: isVerbose() ? 'inherit' : 'pipe',
    encoding: 'utf-8',
    cwd: tmpProjPath(),
  });
  e2eConsoleLogger(
    `Playwright browsers ${execSync('npx playwright --version')
      .toString()
      .trim()} installed.`
  );
}

export function getStrippedEnvironmentVariables() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => {
      if (key.startsWith('NX_E2E_')) {
        return true;
      }

      const allowedKeys = [
        'NX_ADD_PLUGINS',
        'NX_ISOLATE_PLUGINS',
        'NX_VERBOSE_LOGGING',
        'NX_NATIVE_LOGGING',
      ];

      if (key.startsWith('NX_') && !allowedKeys.includes(key)) {
        return false;
      }

      if (key === 'JEST_WORKER_ID') {
        return false;
      }

      return true;
    })
  );
}
