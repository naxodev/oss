import { valid } from 'semver';

const MAX_METADATA_BYTES = 8 * 1024 * 1024;
const MAX_RETRY_DELAY_MS = 30_000;
const TOO_LARGE = Symbol('metadata size limit reached');
const OVERSIZED_FALLBACK = `version URL returned HTTP 404; package metadata exceeds ${MAX_METADATA_BYTES} bytes`;

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
  return (await lookupVersion(expected, options)) === 'published';
}

async function lookupVersion(
  expected: PackageVersion,
  options: RegistryOptions,
  verification?: { deadline: number; skipPackageDocument: boolean }
) {
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
  const packageUrl = new URL(encodeURIComponent(expected.packageName), base);
  function requestSignal(): AbortSignal {
    const remaining = verification
      ? Math.floor(verification.deadline - performance.now())
      : requestTimeoutMs;
    if (remaining <= 0)
      throw new RegistryLookupError(
        'Registry verification deadline reached',
        true
      );
    return AbortSignal.timeout(Math.min(requestTimeoutMs, remaining));
  }
  let metadata = await readMetadata(
    new URL(`${packageUrl.href}/${encodeURIComponent(expected.version)}`),
    requestSignal()
  );
  if (metadata === TOO_LARGE)
    throw new RegistryLookupError(
      `Version metadata exceeds ${MAX_METADATA_BYTES} bytes`,
      false
    );
  if (metadata === undefined) {
    if (!verification) return 'version URL returned HTTP 404';
    if (verification.skipPackageDocument) return OVERSIZED_FALLBACK;
    // The version URL can still serve the pre-publish 404 while the package
    // document already lists the release. Dist-tags alone do not prove identity.
    const pkg = await readMetadata(
      packageUrl,
      requestSignal(),
      'application/vnd.npm.install-v1+json'
    );
    if (pkg === TOO_LARGE) return OVERSIZED_FALLBACK;
    if (pkg === undefined) return 'version and package URLs returned HTTP 404';
    if (
      !isRecord(pkg) ||
      pkg.name !== expected.packageName ||
      !isRecord(pkg.versions)
    ) {
      throw new RegistryLookupError(
        'Registry returned invalid package metadata',
        false
      );
    }
    if (!Object.hasOwn(pkg.versions, expected.version))
      return 'version URL returned HTTP 404; package document does not list the version';
    metadata = pkg.versions[expected.version];
  }
  if (
    !isRecord(metadata) ||
    metadata.name !== expected.packageName ||
    metadata.version !== expected.version
  ) {
    throw new RegistryLookupError(
      'Registry returned a different package identity',
      false
    );
  }
  return 'published';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readMetadata(
  url: URL,
  signal: AbortSignal,
  accept = 'application/json'
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      redirect: 'error',
      headers: { accept, 'cache-control': 'no-cache' },
      signal,
    });
  } catch {
    throw new RegistryLookupError(
      `Registry request failed for ${url.pathname}`,
      true
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 404) return undefined;
    throw new RegistryLookupError(
      `Registry HTTP ${response.status}`,
      response.status === 429 || response.status >= 500
    );
  }
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  try {
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_METADATA_BYTES) {
          await reader.cancel().catch(() => undefined);
          return TOO_LARGE;
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    }
  } catch {
    throw new RegistryLookupError(
      'Registry request failed while reading metadata',
      true
    );
  } finally {
    reader?.releaseLock();
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new RegistryLookupError(
      'Registry returned invalid JSON metadata',
      false
    );
  }
}

/** Wait for a published version to become visible. */
export async function waitForPublishedPackage(
  expected: PackageVersion,
  options: RegistryOptions = {}
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 24;
  let retryDelayMs = options.retryDelayMs ?? 1_000;
  const maxWaitMs = options.maxWaitMs ?? 300_000;
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
  let skipPackageDocument = false;
  retryDelayMs = Math.min(retryDelayMs, MAX_RETRY_DELAY_MS);
  let reason = 'verification deadline reached';
  let attempts = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remaining = Math.floor(deadline - performance.now());
    if (remaining <= 0) break;
    attempts++;
    try {
      const result = await lookupVersion(expected, options, {
        deadline,
        skipPackageDocument,
      });
      if (result === 'published') return;
      if (result === OVERSIZED_FALLBACK) skipPackageDocument = true;
      reason = result;
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
      retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
    }
  }
  throw new Error(
    `Could not verify ${expected.packageName}@${expected.version} after ${attempts} attempts: ${reason}`
  );
}
