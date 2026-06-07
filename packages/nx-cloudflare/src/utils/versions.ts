export const wranglerVersion = '^4.98.0';
// Vendored from `@nx/node/src/utils/versions` to avoid a deep, unstable
// `@nx/*/src/...` import. (`@nx/node` itself remains a dependency — the
// application generator still uses its public `applicationGenerator`.)
export const tslibVersion = '^2.3.0';
export const cloudflareWorkersTypeVersions = '^4.20260606.1';
export const honoVersion = '^4.12.23';
export const vitestPoolWorkersVersion = '^0.16.0';
export const vitestVersion = '^4.1.0';

// Default version of create-cloudflare (C3) the application generator invokes.
// Pinned exact (not ^) so the scaffold is reproducible; overridable per-run via
// the `c3Version` option. `--no-auto-update` keeps C3 from re-spawning @latest.
export const createCloudflareVersion = '2.70.0';
