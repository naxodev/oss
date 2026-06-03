/**
 * Resolve the path to the wrangler CLI entry, raising an actionable error when
 * the package isn't installed. Shared by the serve and deploy executors so both
 * surface the same message instead of a raw module-resolution stack.
 */
export function resolveWranglerBin(): string {
  try {
    return require.resolve('wrangler/bin/wrangler');
  } catch (e) {
    const error = new Error(
      'Unable to find Wrangler. Is the "wrangler" package installed?'
    );
    (error as Error & { cause?: unknown }).cause = e;
    throw error;
  }
}
