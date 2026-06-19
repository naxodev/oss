/**
 * Stops the local registry for e2e testing purposes.
 * Meant to be called from the bun-test preload's `afterAll`
 * (`tools/scripts/e2e-bun-setup.ts`).
 *
 * For the owner setup, the closure assigned to `global.stopLocalRegistry` is
 * async — it waits for peer e2e projects to drop their refcount before
 * stopping verdaccio. Non-owner closures just remove their own lock and
 * resolve immediately.
 */

/// <reference path="registry.d.ts" />

const teardown = async () => {
  if (global.stopLocalRegistry) {
    await global.stopLocalRegistry();
  }
};

export default teardown;
