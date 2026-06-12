#!/usr/bin/env bun
/**
 * Per-file `bun test` runner.
 *
 * `bun test` evaluates every spec file's top-level code (including
 * `mock.module(...)` calls) in a single process before running any test, so
 * module mocks leak across files. Running each spec file in its own `bun test`
 * process isolates those module mocks. Files are run with bounded concurrency
 * for speed; the process exits non-zero if any file fails.
 *
 * Invoked from a project root (Nx sets `cwd` to the project). Every spec file
 * under `src/` is run; extra CLI args are forwarded verbatim to each `bun test`
 * invocation (e.g. `-t "<name>"` to filter by test name). For a single-file
 * focused run, call `bun test <file>` directly instead of this runner.
 */
import { Glob } from 'bun';
import { join } from 'node:path';

const cwd = process.cwd();
const passthrough = process.argv.slice(2);

const glob = new Glob('src/**/*.{spec,test}.{ts,tsx}');
const files = Array.from(glob.scanSync({ cwd })).sort();

if (files.length === 0) {
  console.log('bun-test: no spec files found, passing.');
  process.exit(0);
}

const concurrency = Math.min(8, files.length);
const failures: string[] = [];
let cursor = 0;

async function runOne(file: string): Promise<void> {
  const proc = Bun.spawn(['bun', 'test', join(cwd, file), ...passthrough], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  // bun test writes its summary to stderr; surface failures verbosely.
  if (code !== 0) {
    failures.push(file);
    console.log(`\n✗ ${file}\n${stdout}${stderr}`);
  } else {
    const summary = (stderr.match(/\d+ pass[\s\S]*?\d+ fail/m) ?? [''])[0]
      .replace(/\n/g, ' ')
      .trim();
    console.log(`✓ ${file}${summary ? `  (${summary})` : ''}`);
  }
}

async function worker(): Promise<void> {
  while (cursor < files.length) {
    const file = files[cursor++];
    // Treat a runner-level error (spawn/stream failure, not a test failure) as
    // a failed file so it's reported and the remaining queue still drains,
    // rather than rejecting Promise.all and aborting untested specs.
    try {
      await runOne(file);
    } catch (e) {
      failures.push(file);
      console.log(`\n✗ ${file} (runner error)\n${e}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log(
  `\nbun-test: ${files.length - failures.length}/${files.length} files passed.`
);
if (failures.length > 0) {
  console.log(`Failed files:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
