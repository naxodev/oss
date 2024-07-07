const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  maxWorkers: 1,
  testEnvironment: 'node',
  setupFiles: ['../../tools/scripts/unit-test-setup.js'],
};
