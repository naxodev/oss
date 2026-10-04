import { valid } from 'semver';

export interface PackageVersion {
  packageName: string;
  version: string;
}

export interface RegistryOptions {
  registry?: string;
  retryDelayMs?: number;
  maxAttempts?: number;
  maxWaitMs?: number;
  requestTimeoutMs?: number;
  onRetry?: (message: string) => void;
}

class RegistryLookupError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

/** Check exact package identity at the registry's version endpoint. */
export async function isPackagePublished(
  expected: PackageVersion,
  options: RegistryOptions = {}
): Promise<boolean> {
  if (
    !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(
      expected.packageName
    )
  ) {
    throw new Error('Invalid npm package name');
  }
  if (valid(expected.version) !== expected.version) {
    throw new Error('Invalid exact npm package version');
  }
  const requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error('Registry request timeout must be a positive integer');
  }
  const registry = options.registry ?? 'https://registry.npmjs.org/';
  const base = new URL(registry);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname);
  if (
    base.username ||
    base.password ||
    (!loopback &&
      (base.protocol !== 'https:' || base.hostname !== 'registry.npmjs.org')) ||
    (loopback && !['http:', 'https:'].includes(base.protocol))
  ) {
    throw new Error(
      'Registry must be public npm over HTTPS or a loopback test server, without credentials'
    );
  }
  const url = new URL(
    `${encodeURIComponent(expected.packageName)}/${encodeURIComponent(
      expected.version
    )}`,
    base
  );
  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      redirect: 'error',
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    throw new RegistryLookupError(
      `Registry request failed for ${expected.packageName}@${expected.version}`,
      true
    );
  }
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new RegistryLookupError(
      `Registry HTTP ${response.status}`,
      response.status === 429 || response.status >= 500
    );
  }
  let body: string;
  try {
    body = await response.text();
  } catch {
    throw new RegistryLookupError(
      'Registry request failed while reading metadata',
      true
    );
  }
  let metadata: unknown;
  try {
    metadata = JSON.parse(body);
  } catch {
    throw new RegistryLookupError(
      'Registry returned invalid JSON metadata',
      false
    );
  }
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('name' in metadata) ||
    !('version' in metadata) ||
    metadata.name !== expected.packageName ||
    metadata.version !== expected.version
  ) {
    throw new RegistryLookupError(
      'Registry returned a different package identity',
      false
    );
  }
  return true;
}

/** Wait for a published version to become visible. */
export async function waitForPublishedPackage(
  expected: PackageVersion,
  options: RegistryOptions = {}
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 24;
  const retryDelayMs = options.retryDelayMs ?? 5_000;
  const maxWaitMs = options.maxWaitMs ?? 120_000;
  if (
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts <= 0 ||
    !Number.isSafeInteger(maxWaitMs) ||
    maxWaitMs <= 0 ||
    !Number.isSafeInteger(retryDelayMs) ||
    retryDelayMs < 0
  ) {
    throw new Error('Invalid registry retry budget');
  }
  const deadline = performance.now() + maxWaitMs;
  let reason = 'version not visible (HTTP 404)';
  let attempts = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remaining = Math.floor(deadline - performance.now());
    if (remaining <= 0) break;
    attempts++;
    try {
      if (
        await isPackagePublished(expected, {
          ...options,
          requestTimeoutMs: Math.min(
            options.requestTimeoutMs ?? 10_000,
            remaining
          ),
        })
      )
        return;
      reason = 'version not visible (HTTP 404)';
    } catch (error) {
      if (!(error instanceof RegistryLookupError) || !error.retryable)
        throw error;
      reason = error.message;
    }
    options.onRetry?.(
      `${expected.packageName}@${expected.version}: attempt ${attempt}/${maxAttempts}: ${reason}`
    );
    if (attempt < maxAttempts) {
      const delay = Math.min(
        retryDelayMs,
        Math.max(0, deadline - performance.now())
      );
      await Bun.sleep(delay);
    }
  }
  throw new Error(
    `Could not verify ${expected.packageName}@${expected.version} after ${attempts} attempts: ${reason}`
  );
}
