/**
 * Bun test preload for the e2e suites. Replaces jest's globalSetup/
 * globalTeardown: starts the local Verdaccio registry (and publishes the
 * plugins at `0.0.0-e2e`) before any spec runs, and stops it after.
 *
 * Loaded via `bun test --preload`, so these hooks run once per `bun test`
 * process, before/after every spec file in that run. The owner/non-owner
 * lock coordination in start-local-registry handles the two e2e projects
 * sharing one registry across separate `bun test` processes.
 */
/// <reference path="registry.d.ts" />

import { beforeAll, afterAll } from 'bun:test';
import setup from './start-local-registry';
import teardown from './stop-local-registry';

// Registry startup + publish can take a while on a cold storage dir.
beforeAll(async () => {
  await setup();
}, 300_000);

afterAll(async () => {
  await teardown();
}, 300_000);
