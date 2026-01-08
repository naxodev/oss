/**
 * This script stops the local registry for e2e testing purposes.
 * It is meant to be called in jest's globalTeardown.
 */

/// <reference path="registry.d.ts" />

const teardown = () => {
  if (global.stopLocalRegistry) {
    global.stopLocalRegistry();
  }
};

export default teardown;
module.exports = teardown;
