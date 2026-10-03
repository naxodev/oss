import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { tmpProjPath, uniq } from '@nx/plugin/testing';
import { cleanup, createTestProject, runCLI } from '@naxodev/e2e-utils';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('Go executors from project directories', () => {
  beforeAll(() => {
    createTestProject('gonx');
    runCLI('generate @naxodev/gonx:init');
  }, 300_000);

  afterAll(() => cleanup());

  it('builds from the project directory without relying on a cached workspace-root build', () => {
    const projectRoot = `apps/${uniq('goapp')}`;
    runCLI(`generate @naxodev/gonx:application ${projectRoot}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    const rootBuild = runCLI(`build ${projectRoot} --skip-nx-cache`);
    expect(rootBuild).toContain(
      `NX   Successfully ran target build for project ${projectRoot}`
    );

    // A cached root build would hide a broken working directory.
    const projectBuild = runCLI('build --skip-nx-cache', {
      cwd: join(tmpProjPath(), projectRoot),
    });
    expect(projectBuild).toContain(
      `NX   Successfully ran target build for project ${projectRoot}`
    );
  }, 120_000);

  it('builds the selected main file when invoked from the project directory', () => {
    const projectRoot = `apps/${uniq('goapp')}`;
    runCLI(`generate @naxodev/gonx:application ${projectRoot}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    const projectDirectory = join(tmpProjPath(), projectRoot);
    const mainDirectory = join(projectDirectory, 'cmd/server');
    mkdirSync(mainDirectory, { recursive: true });
    writeFileSync(
      join(mainDirectory, 'main.go'),
      `package main

import "fmt"

func main() {
    fmt.Println("Hello from project main!")
}
`
    );

    const outputPath = `dist/${projectRoot}/custom-main`;
    const projectBuild = runCLI(
      `build --main=cmd/server/main.go --outputPath=${outputPath} --skip-nx-cache`,
      { cwd: projectDirectory }
    );
    expect(projectBuild).toContain(
      `NX   Successfully ran target build for project ${projectRoot}`
    );
    expect(
      execFileSync(join(tmpProjPath(), outputPath), { encoding: 'utf-8' })
    ).toBe('Hello from project main!\n');
  }, 120_000);
});
