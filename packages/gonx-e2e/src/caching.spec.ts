import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { uniq, tmpProjPath } from '@nx/plugin/testing';
import {
  createTestProject,
  cleanup,
  runCLI,
  showProject,
} from '@naxodev/e2e-utils';
import { join } from 'path';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

// Regression coverage for https://github.com/naxodev/oss/issues/217: gonx's
// inferred targets used to hash only project-local files, so in a Go
// monorepo (go.work, or replace directives) editing a shared library did NOT
// invalidate a dependent app's build/test cache -- `nx build app` returned a
// stale binary from cache. The fix gives every gonx-inferred project a
// `goSource` named input and wires `['goSource', '^goSource']` into
// build/test/lint/tidy (and `['goSource']` only into `generate`, which is
// intentionally project-local -- see get-targets-by-project-type.ts).
//
// These tests exercise the fix end-to-end against a *real* Nx workspace with
// the plugin installed from the local Verdaccio registry (see
// createTestProject), not just unit-level input assertions.

/**
 * Nx marks each cached task inline right after its command header, e.g.
 * "> nx run app:build  [local cache]", and also prints a run summary like
 * "Nx read the output from the cache instead of running the command for N
 * out of M tasks." when at least one task was served from cache (see Nx's
 * `output.addTaskStatus` / the static run-one/run-many life cycles).
 *
 * A whole-output substring check is only reliable for targets that run in
 * isolation (lint/tidy have no `dependsOn`). `build`/`test` cascade through
 * `generate`/`^build` dependency tasks (e.g. `nx test app` also runs
 * `lib1:generate` and `lib2:generate`), and those tasks can have a *different*
 * cache status than the task actually under test -- so when a `task` id
 * ("<project>:<target>") is given, scope the check to that task's own output
 * line instead of the whole command output.
 */
const isCacheHit = (out: string, task?: string): boolean => {
  const hasCacheMarker = (text: string) =>
    text.includes('[local cache]') ||
    text.includes('[remote cache]') ||
    text.includes('[existing outputs match the cache, left as is]') ||
    text.includes('read the output from the cache');

  if (!task) {
    return hasCacheMarker(out);
  }

  const taskLine = out.split('\n').find((line) => line.includes(`run ${task}`));

  return !!taskLine && hasCacheMarker(taskLine);
};

/** Reads the `module` path declared at the top of a project's go.mod. */
function readModulePath(projectDir: string): string {
  const content = readFileSync(join(projectDir, 'go.mod'), 'utf-8');
  const match = content.match(/module\s+(\S+)/);
  if (!match) {
    throw new Error(
      `Could not find a module directive in ${projectDir}/go.mod`
    );
  }
  return match[1];
}

/**
 * A library's own test file, generic enough that it never needs to be kept
 * in sync with the string constant its `Value()` function returns -- only
 * the app-level test (which asserts on the exact composed value) needs that.
 */
function genericLibTestFile(pkgName: string): string {
  return `package ${pkgName}

import "testing"

func TestValue(t *testing.T) {
	if Value() == "" {
		t.Fatal("expected Value() to return a non-empty string")
	}
}
`;
}

/** Runs the single binary found in `distDir` and returns its stdout. */
function runBuiltBinary(distDir: string): string {
  const [binaryName] = readdirSync(distDir);
  if (!binaryName) {
    throw new Error(`No binary found in ${distDir}`);
  }
  // execFileSync (not execSync) so the binary is exec'd directly with no
  // shell in between -- the file name comes from readdirSync, and passing it
  // as a shell command string would let a name with spaces/metacharacters
  // break or inject (CodeQL js/shell-command-injection-from-environment).
  return execFileSync(join(distDir, binaryName), { encoding: 'utf-8' });
}

describe('Caching with dependency inputs (go.work workspace)', () => {
  const lib2 = uniq('golib2');
  const lib1 = uniq('golib1');
  const app = uniq('goapp');
  const unrelatedApp = uniq('unrelated');

  // gonx names inferred projects by their root path (see createNodesInternal:
  // name = projectRoot), and the generators do not write a project.json that
  // could override it — so with the nested apps//libs/ layout, the Nx project
  // names are "apps/<app>" and "libs/<lib>", not the bare generator names.
  const appProject = `apps/${app}`;
  const unrelatedAppProject = `apps/${unrelatedApp}`;
  const lib1Project = `libs/${lib1}`;
  const lib2Project = `libs/${lib2}`;

  let lib1ModulePath: string;
  let lib2ModulePath: string;

  // IMPORTANT: editing a library must touch ONLY that library's files. The
  // whole point of these tests is that a change in a dependency alone -- with
  // zero changes inside the app -- invalidates the app's cache. If a lib edit
  // also rewrote a file under apps/<app> (e.g. to keep an exact-value test
  // expectation in sync), the app's own inputs would change and the cache
  // would miss even WITHOUT dependency inputs, masking the regression this
  // suite exists to catch. That's why the app's test (written once in
  // beforeAll) asserts a stable prefix instead of the exact composed value.
  function writeLib2Source(value: string): void {
    writeFileSync(
      join(tmpProjPath(), 'libs', lib2, `${lib2}.go`),
      `package ${lib2}

func Value() string {
	return "${value}"
}
`
    );
  }

  function writeLib1Source(value: string): void {
    writeFileSync(
      join(tmpProjPath(), 'libs', lib1, `${lib1}.go`),
      `package ${lib1}

import (
	"${lib2ModulePath}"
)

func Value() string {
	return "${value}-" + ${lib2}.Value()
}
`
    );
  }

  beforeAll(() => {
    // Create a real Nx workspace and install @naxodev/gonx from the local
    // registry — exercises the published-tarball install path (peerDeps,
    // exports) that the legacy ensureNxProject fixture never touched.
    createTestProject('gonx');

    // Initialize Go support with go.work: generators append `use` entries to
    // go.work, so cross-module imports resolve without replace directives.
    runCLI('generate @naxodev/gonx:init --addGoDotWork');

    // Nx-conventional layout: two libs (lib1 -> lib2), one app depending on
    // lib1 (transitively on lib2), and one unrelated app with no imports of
    // either lib (used to prove the fix isn't over-broad).
    runCLI(
      `generate @naxodev/gonx:library --directory="libs/${lib2}" --name=${lib2}`,
      {
        env: { NX_ADD_PLUGINS: 'true' },
      }
    );
    runCLI(
      `generate @naxodev/gonx:library --directory="libs/${lib1}" --name=${lib1}`,
      {
        env: { NX_ADD_PLUGINS: 'true' },
      }
    );
    runCLI(
      `generate @naxodev/gonx:application --directory="apps/${app}" --name=${app}`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );
    runCLI(
      `generate @naxodev/gonx:application --directory="apps/${unrelatedApp}" --name=${unrelatedApp}`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Reset before running anything so the daemon picks up all four
    // freshly-generated projects (mirrors application.spec.ts).
    runCLI('reset');

    lib1ModulePath = readModulePath(join(tmpProjPath(), 'libs', lib1));
    lib2ModulePath = readModulePath(join(tmpProjPath(), 'libs', lib2));

    // Wire lib1 -> lib2 and app -> lib1. All test files (libs' and app's)
    // are value-agnostic so that lib edits never require touching any other
    // project -- see the note above writeLib2Source.
    writeFileSync(
      join(tmpProjPath(), 'libs', lib2, `${lib2}_test.go`),
      genericLibTestFile(lib2)
    );
    writeFileSync(
      join(tmpProjPath(), 'libs', lib1, `${lib1}_test.go`),
      genericLibTestFile(lib1)
    );
    writeLib2Source('lib2-initial');
    writeLib1Source('lib1-initial');

    // The app's own test is written ONCE and never rewritten (see the note
    // above writeLib2Source): it asserts a prefix that stays stable across
    // every lib edit in this suite, so lib edits never need to touch the app.
    writeFileSync(
      join(tmpProjPath(), 'apps', app, 'main_test.go'),
      `package main

import (
	"strings"
	"testing"

	"${lib1ModulePath}"
)

func TestMainValue(t *testing.T) {
	if !strings.HasPrefix(${lib1}.Value(), "lib1-") {
		t.Fatalf("expected a lib1-prefixed value, got %q", ${lib1}.Value())
	}
}
`
    );

    writeFileSync(
      join(tmpProjPath(), 'apps', app, 'main.go'),
      `package main

import (
	"fmt"

	"${lib1ModulePath}"
)

func main() {
	fmt.Println(${lib1}.Value())
}
`
    );

    // In go.work mode `go mod tidy` doesn't need to add anything (the
    // workspace's `use` entries already make sibling modules resolvable),
    // but running it mirrors what real users do after wiring up imports.
    runCLI(`tidy ${lib2Project}`);
    runCLI(`tidy ${lib1Project}`);
    runCLI(`tidy ${appProject}`);

    runCLI('reset');
  }, 300_000);

  afterAll(() => cleanup());

  it('inferred targets declare dependency inputs', () => {
    const project = showProject(appProject) as {
      targets?: Record<string, { inputs?: string[] }>;
    };

    for (const targetName of ['build', 'test', 'lint', 'tidy']) {
      const inputs = project.targets?.[targetName]?.inputs ?? [];
      expect(inputs).toContain('goSource');
      expect(inputs).toContain('^goSource');
    }

    const generateInputs = project.targets?.['generate']?.inputs ?? [];
    expect(generateInputs).toContain('goSource');
    expect(generateInputs).not.toContain('^goSource');
  }, 120_000);

  it('build cache invalidates when a direct dependency changes', () => {
    const firstBuild = runCLI(`build ${appProject}`);
    expect(firstBuild).toContain(
      `Successfully ran target build for project ${appProject}`
    );
    expect(isCacheHit(firstBuild, `${appProject}:build`)).toBe(false);

    const secondBuild = runCLI(`build ${appProject}`);
    expect(isCacheHit(secondBuild, `${appProject}:build`)).toBe(true);

    // This is the exact end-to-end repro from issue #217: editing a
    // dependency library must invalidate the app's build cache, and a
    // rebuild must produce a binary reflecting the NEW value -- not a stale
    // cached one.
    const newValue = `lib1-changed-${uniq('marker')}`;
    writeLib1Source(newValue);

    const thirdBuild = runCLI(`build ${appProject}`);
    expect(thirdBuild).toContain(
      `Successfully ran target build for project ${appProject}`
    );
    expect(isCacheHit(thirdBuild, `${appProject}:build`)).toBe(false);

    const distDir = join(tmpProjPath(), 'dist', 'apps', app);
    const stdout = runBuiltBinary(distDir);
    expect(stdout).toContain(newValue);
  }, 180_000);

  it('test cache invalidates when a direct dependency changes', () => {
    const firstTest = runCLI(`test ${appProject}`);
    expect(firstTest).toContain(
      `Successfully ran target test for project ${appProject}`
    );
    expect(isCacheHit(firstTest, `${appProject}:test`)).toBe(false);

    const secondTest = runCLI(`test ${appProject}`);
    expect(isCacheHit(secondTest, `${appProject}:test`)).toBe(true);

    // Edit ONLY the library. The app's test asserts a stable prefix, so it
    // still passes -- what must change is the cache verdict: the re-run is a
    // MISS purely because a dependency's source changed.
    const newValue = `lib1-fortest-${uniq('marker')}`;
    writeLib1Source(newValue);

    const thirdTest = runCLI(`test ${appProject}`);
    expect(thirdTest).toContain(
      `Successfully ran target test for project ${appProject}`
    );
    expect(isCacheHit(thirdTest, `${appProject}:test`)).toBe(false);
  }, 180_000);

  it('transitive dependency change invalidates dependents', () => {
    // Re-establish a clean cache baseline for both app:build and lib1:test
    // — earlier tests already changed lib1's source, so the caches from
    // those tests don't apply here.
    runCLI(`build ${appProject}`);
    const cachedBuild = runCLI(`build ${appProject}`);
    expect(isCacheHit(cachedBuild, `${appProject}:build`)).toBe(true);

    runCLI(`test ${lib1Project}`);
    const cachedLib1Test = runCLI(`test ${lib1Project}`);
    expect(isCacheHit(cachedLib1Test, `${lib1Project}:test`)).toBe(true);

    // Edit lib2 -- the transitive dependency lib1 calls internally. This
    // must invalidate both lib1's own test cache (lib1 -> lib2, one hop)
    // and app's build cache (app -> lib1 -> lib2, two hops).
    const newLib2Value = `lib2-transitive-${uniq('marker')}`;
    writeLib2Source(newLib2Value);

    const missedBuild = runCLI(`build ${appProject}`);
    expect(isCacheHit(missedBuild, `${appProject}:build`)).toBe(false);

    const missedLib1Test = runCLI(`test ${lib1Project}`);
    expect(isCacheHit(missedLib1Test, `${lib1Project}:test`)).toBe(false);
  }, 180_000);

  it('unrelated project stays cached', () => {
    runCLI(`build ${unrelatedAppProject}`);
    const cachedUnrelated = runCLI(`build ${unrelatedAppProject}`);
    expect(isCacheHit(cachedUnrelated, `${unrelatedAppProject}:build`)).toBe(
      true
    );

    // unrelatedApp has no dependency edge on lib1/lib2 in the project graph,
    // so editing lib1 must NOT invalidate it -- guards against over-broad
    // inputs (e.g. accidentally hashing the whole workspace).
    const newValue = `lib1-unrelated-check-${uniq('marker')}`;
    writeLib1Source(newValue);

    const stillCachedUnrelated = runCLI(`build ${unrelatedAppProject}`);
    expect(
      isCacheHit(stillCachedUnrelated, `${unrelatedAppProject}:build`)
    ).toBe(true);
  }, 180_000);
});

describe('Caching with dependency inputs (replace directives, no go.work)', () => {
  const lib = uniq('golib');
  const app = uniq('goapp');

  // Path-based inferred project names — see the note in the first suite.
  const appProject = `apps/${app}`;

  let libModulePath: string;

  // Lib edits must touch only the lib -- see the equivalent note in the
  // go.work suite. The app's test (written once in beforeAll) asserts a
  // stable prefix so it never needs re-syncing.
  function writeLibSource(value: string): void {
    writeFileSync(
      join(tmpProjPath(), 'libs', lib, `${lib}.go`),
      `package ${lib}

func Value() string {
	return "${value}"
}
`
    );
  }

  beforeAll(() => {
    createTestProject('gonx');

    // No --addGoDotWork: this workspace wires the dependency the "classic"
    // Go monorepo way, via a `replace` directive in the app's go.mod.
    runCLI('generate @naxodev/gonx:init');

    runCLI(
      `generate @naxodev/gonx:library --directory="libs/${lib}" --name=${lib}`,
      {
        env: { NX_ADD_PLUGINS: 'true' },
      }
    );
    runCLI(
      `generate @naxodev/gonx:application --directory="apps/${app}" --name=${app}`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    runCLI('reset');

    libModulePath = readModulePath(join(tmpProjPath(), 'libs', lib));

    writeFileSync(
      join(tmpProjPath(), 'libs', lib, `${lib}_test.go`),
      genericLibTestFile(lib)
    );
    writeLibSource('lib-initial');

    writeFileSync(
      join(tmpProjPath(), 'apps', app, 'main_test.go'),
      `package main

import (
	"strings"
	"testing"

	"${libModulePath}"
)

func TestMainValue(t *testing.T) {
	if !strings.HasPrefix(${lib}.Value(), "lib-") {
		t.Fatalf("expected a lib-prefixed value, got %q", ${lib}.Value())
	}
}
`
    );

    writeFileSync(
      join(tmpProjPath(), 'apps', app, 'main.go'),
      `package main

import (
	"fmt"

	"${libModulePath}"
)

func main() {
	fmt.Println(${lib}.Value())
}
`
    );

    // Wire app -> lib with a replace directive, exactly like
    // static-analysis.spec.ts does for its non-go.work workspace, but with
    // the nested apps/libs layout's relative path.
    const appGoModPath = join(tmpProjPath(), 'apps', app, 'go.mod');
    const appGoModContent = readFileSync(appGoModPath, 'utf-8');
    writeFileSync(
      appGoModPath,
      `${appGoModContent}
replace ${libModulePath} => ../../libs/${lib}
`
    );

    // `go mod tidy` adds the `require <module> v0.0.0-...` line the replace
    // directive needs -- without it, `go build`/`go test` can't resolve the
    // import even though the replace target exists on disk.
    runCLI(`tidy ${appProject}`);

    runCLI('reset');
  }, 300_000);

  afterAll(() => cleanup());

  it('build cache invalidates when a direct dependency changes', () => {
    runCLI(`build ${appProject}`);
    const cachedBuild = runCLI(`build ${appProject}`);
    expect(isCacheHit(cachedBuild, `${appProject}:build`)).toBe(true);

    const newValue = `lib-replace-changed-${uniq('marker')}`;
    writeLibSource(newValue);

    const missedBuild = runCLI(`build ${appProject}`);
    expect(missedBuild).toContain(
      `Successfully ran target build for project ${appProject}`
    );
    expect(isCacheHit(missedBuild, `${appProject}:build`)).toBe(false);

    const distDir = join(tmpProjPath(), 'dist', 'apps', app);
    const stdout = runBuiltBinary(distDir);
    expect(stdout).toContain(newValue);
  }, 180_000);

  it('test cache invalidates when a direct dependency changes', () => {
    runCLI(`test ${appProject}`);
    const cachedTest = runCLI(`test ${appProject}`);
    expect(isCacheHit(cachedTest, `${appProject}:test`)).toBe(true);

    const newValue = `lib-replace-fortest-${uniq('marker')}`;
    writeLibSource(newValue);

    const missedTest = runCLI(`test ${appProject}`);
    expect(missedTest).toContain(
      `Successfully ran target test for project ${appProject}`
    );
    expect(isCacheHit(missedTest, `${appProject}:test`)).toBe(false);
  }, 180_000);
});
