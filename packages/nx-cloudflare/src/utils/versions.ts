export const wranglerVersion = '^4.98.0';
// Version of tslib added to generated projects by the init generator.
export const tslibVersion = '^2.3.0';
export const cloudflareWorkersTypeVersions = '^4.20260606.1';
export const vitestPoolWorkersVersion = '^0.16.0';
export const vitestVersion = '^4.1.0';

// Default version of create-cloudflare (C3) the create-cloudflare generator invokes.
// Pinned exact (not ^) so the scaffold is reproducible; overridable per-run via
// the `c3Version` option. `--no-auto-update` keeps C3 from re-spawning @latest.
export const createCloudflareVersion = '2.70.0';
