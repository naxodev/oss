import {
  uniq,
  fileExists,
  tmpProjPath,
  runNxCommand,
  ensureNxProject,
  cleanup,
  directoryExists,
} from '@nx/plugin/testing';
import { promisifiedTreeKill, runCommandUntil } from '@naxodev/e2e-utils';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('Go Applications (with go.work)', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support first with go.work support
    runNxCommand('generate @naxodev/gonx:init --addGoDotWork');
  });

  afterEach(() => cleanup());

  it('should be able to generate a Go application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();
  }, 30_000);

  it('should be able to generate an application with a specific directory', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" --name=${goapp}`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Verify the application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to run build, lint, test, generate and tidy commands on a Go application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run generate
    const generateResults = runNxCommand(`run ${goapp}:generate`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to run the serve command on a Go application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run serve and wait until the server starts
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`Hello ${goapp}`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to build a Go application with custom main option', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Create a custom main.go file in a subdirectory
    const customMainDir = join(tmpProjPath(), `${goapp}/cmd/server`);
    mkdirSync(customMainDir, { recursive: true });

    writeFileSync(
      join(customMainDir, 'main.go'),
      `package main

import "fmt"

func main() {
    fmt.Println("Hello from custom main!")
}
`
    );

    // Build with custom main option
    const buildResults = runNxCommand(
      `build ${goapp} --main=cmd/server/main.go`
    );
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();
  }, 120_000);

  it('should be able to serve a Go application with custom main option', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Create a custom main.go file in a subdirectory
    const customMainDir = join(tmpProjPath(), `${goapp}/cmd/server`);
    mkdirSync(customMainDir, { recursive: true });

    writeFileSync(
      join(customMainDir, 'main.go'),
      `package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from custom ${goapp} server!")
    })
    fmt.Println("Custom ${goapp} server starting...")
    http.ListenAndServe(":8080", nil)
}
`
    );

    // Run serve with custom main option
    const p = await runCommandUntil(
      `serve ${goapp} --main=cmd/server/main.go`,
      (output: string) => output.includes(`Custom ${goapp} server starting...`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to run the generate command with custom flags', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Create a Go file with go:generate directive
    writeFileSync(
      join(tmpProjPath(), `${goapp}/generated.go`),
      `package main

//go:generate echo "Generated code would go here"

var GeneratedVar = "placeholder"
`
    );

    // Run generate with verbose flag
    const generateResults = runNxCommand(`run ${goapp}:generate --flags=-v`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );
  }, 120_000);

  it('should be able to generate a CLI application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=cli`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the CLI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/cmd/version.go`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to generate a CLI application with a specific directory', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" ${goapp} --variant=cli`,
      {
        env: { NX_ADD_PLUGINS: 'true' },
      }
    );

    // Verify the CLI application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/cmd/version.go`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to run build, lint, test, generate and tidy commands on a CLI application', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=cli`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the CLI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run generate
    const generateResults = runNxCommand(`run ${goapp}:generate`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to generate a TUI application', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=tui`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the TUI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/ui/model.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/ui/view.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/ui/styles.go`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to generate a TUI application with a specific directory', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" ${goapp} --variant=tui`,
      {
        env: { NX_ADD_PLUGINS: 'true' },
      }
    );

    // Verify the TUI application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/ui/model.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/ui/view.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/ui/styles.go`))
    ).toBeTruthy();
  }, 30_000);

  it('should be able to run build, lint, test, generate and tidy commands on a TUI application', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=tui`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the TUI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run generate
    const generateResults = runNxCommand(`run ${goapp}:generate`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to run the serve command on a CLI application', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=cli`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the CLI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run serve and wait until the CLI app runs and prints its message
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`Hello from ${goapp}!`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to run the serve command on a TUI application', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=tui`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the TUI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run serve and wait until the TUI app starts and shows the interface
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`=== ${goapp} ===`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);
});

describe('Go Applications (without go.work)', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');

    // Initialize Go support without go.work support (new default)
    runNxCommand('generate @naxodev/gonx:init');
  });

  afterEach(() => cleanup());

  it('should be able to generate a Go application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  }, 30_000);

  it('should be able to generate an application with a specific directory without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" --name=${goapp}`,
      { env: { NX_ADD_PLUGINS: 'true' } }
    );

    // Verify the application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  }, 30_000);

  it('should be able to run build, lint, test, generate and tidy commands on a Go application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run generate
    const generateResults = runNxCommand(`run ${goapp}:generate`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to run the serve command on a Go application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run serve and wait until the server starts
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`Hello ${goapp}`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to build a Go application with custom main option without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Create a custom main.go file in a subdirectory
    const customMainDir = join(tmpProjPath(), `${goapp}/cmd/server`);
    mkdirSync(customMainDir, { recursive: true });

    writeFileSync(
      join(customMainDir, 'main.go'),
      `package main

import "fmt"

func main() {
    fmt.Println("Hello from custom main!")
}
`
    );

    // Build with custom main option
    const buildResults = runNxCommand(
      `build ${goapp} --main=cmd/server/main.go`
    );
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();
  }, 120_000);

  it('should be able to serve a Go application with custom main option without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Create a custom main.go file in a subdirectory
    const customMainDir = join(tmpProjPath(), `${goapp}/cmd/server`);
    mkdirSync(customMainDir, { recursive: true });

    writeFileSync(
      join(customMainDir, 'main.go'),
      `package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from custom ${goapp} server!")
    })
    fmt.Println("Custom ${goapp} server starting...")
    http.ListenAndServe(":8080", nil)
}
`
    );

    // Run serve with custom main option
    const p = await runCommandUntil(
      `serve ${goapp} --main=cmd/server/main.go`,
      (output: string) => output.includes(`Custom ${goapp} server starting...`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to run the generate command with custom flags without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp}`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Create a Go file with go:generate directive
    writeFileSync(
      join(tmpProjPath(), `${goapp}/generated.go`),
      `package main

//go:generate echo "Generated code would go here"

var GeneratedVar = "placeholder"
`
    );

    // Run generate with verbose flag
    const generateResults = runNxCommand(`run ${goapp}:generate --flags=-v`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );
  }, 120_000);

  it('should be able to generate a CLI application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=cli`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the CLI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/cmd/version.go`))
    ).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  }, 30_000);

  it('should be able to generate a CLI application without go.work in a specific directory', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" ${goapp} --variant=cli`,
      {
        env: { NX_ADD_PLUGINS: 'true' },
      }
    );

    // Verify the CLI application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/cmd/version.go`))
    ).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  });

  it('should be able to run build, lint, test, generate and tidy commands on a CLI application without go.work', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=cli`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the CLI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run generate
    const generateResults = runNxCommand(`run ${goapp}:generate`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to generate a TUI application without go.work', async () => {
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=tui`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the TUI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();
    expect(fileExists(join(tmpProjPath(), `${goapp}/go.mod`))).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/ui/model.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/ui/view.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `${goapp}/internal/ui/styles.go`))
    ).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  }, 30_000);

  it('should be able to generate a TUI application without go.work in a specific directory', async () => {
    const goapp = uniq('goapp');

    runNxCommand(
      `generate @naxodev/gonx:application --directory="apps/${goapp}" ${goapp} --variant=tui`,
      {
        env: { NX_ADD_PLUGINS: 'true' },
      }
    );

    // Verify the TUI application files were created
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/main.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/go.mod`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/cmd/root.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/ui/model.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/ui/view.go`))
    ).toBeTruthy();
    expect(
      fileExists(join(tmpProjPath(), `apps/${goapp}/internal/ui/styles.go`))
    ).toBeTruthy();

    // Verify go.work was NOT created
    expect(fileExists(join(tmpProjPath(), 'go.work'))).toBeFalsy();
  });

  it('should be able to run build, lint, test, generate and tidy commands on a TUI application without go.work', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=tui`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the TUI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    // Run tidy
    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run lint
    const lintResults = runNxCommand(`lint ${goapp}`);
    expect(lintResults).toContain(
      `NX   Successfully ran target lint for project ${goapp}`
    );

    // Run generate
    const generateResults = runNxCommand(`run ${goapp}:generate`);
    expect(generateResults).toContain(
      `NX   Successfully ran target generate for project ${goapp}`
    );

    // Run build
    const buildResults = runNxCommand(`build ${goapp}`);
    expect(buildResults).toContain(
      `NX   Successfully ran target build for project ${goapp}`
    );

    expect(directoryExists(join(tmpProjPath(), `dist/${goapp}`))).toBeTruthy();

    // Run test
    const testResults = runNxCommand(`test ${goapp}`);
    expect(testResults).toContain(
      `NX   Successfully ran target test for project ${goapp}`
    );
  }, 120_000);

  it('should be able to run the serve command on a CLI application without go.work', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=cli`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the CLI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run serve and wait until the CLI app runs and prints its message
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`Hello from ${goapp}!`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);

  it('should be able to run the serve command on a TUI application without go.work', async () => {
    if (process.env.CI) {
      console.log('Skipping test in CI environment');
      return;
    }
    const goapp = uniq('goapp');

    runNxCommand(`generate @naxodev/gonx:application ${goapp} --variant=tui`, {
      env: { NX_ADD_PLUGINS: 'true' },
    });

    // Verify the TUI application files were created
    expect(fileExists(join(tmpProjPath(), `${goapp}/main.go`))).toBeTruthy();

    const tidyResults = runNxCommand(`tidy ${goapp}`);
    expect(tidyResults).toContain(
      `NX   Successfully ran target tidy for project ${goapp}`
    );

    // Run serve and wait until the TUI app starts and shows the interface
    const p = await runCommandUntil(`serve ${goapp}`, (output: string) =>
      output.includes(`=== ${goapp} ===`)
    );

    // Kill the process after verification
    if (p.pid) {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
    }
  }, 120_000);
});
