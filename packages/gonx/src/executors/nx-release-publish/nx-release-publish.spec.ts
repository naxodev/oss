/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  MockInstance,
} from 'vitest';
import { ExecutorContext } from '@nx/devkit';
import runExecutor from './nx-release-publish';
import { NxReleasePublishExecutorSchema } from './schema';

// Import the mocked modules
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Mock devkit
vi.mock('@nx/devkit', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    output: {
      ...actual.output,
      error: vi.fn(),
      logSingleLine: vi.fn(),
    },
    readJsonFile: vi.fn().mockReturnValue({
      release: {
        releaseTagPattern: '{projectName}-v{version}',
      },
    }),
  };
});

describe('NxReleasePublish Executor', () => {
  const options: NxReleasePublishExecutorSchema = {};

  const context: ExecutorContext = {
    root: '/root',
    cwd: '/root',
    isVerbose: false,
    projectName: 'test-go-project',
    projectGraph: {
      nodes: {},
      dependencies: {},
    },
    projectsConfigurations: {
      projects: {
        'test-go-project': {
          root: 'projects/test-go-project',
          sourceRoot: 'projects/test-go-project',
          projectType: 'library',
          targets: {},
        },
      },
      version: 2,
    },
    nxJsonConfiguration: {},
  };

  const mockGoModContents = `module github.com/testorg/test-go-project
go 1.20

require (
	github.com/example/pkg v1.2.3
)
`;

  // Set up console spy to verify output
  let consoleLogSpy: MockInstance<{
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  }>;
  let consoleErrorSpy: MockInstance<{
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  }>;
  let consoleWarnSpy: MockInstance<{
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  }>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful read of go.mod file
    vi.mocked(readFileSync).mockReturnValue(mockGoModContents);

    // Mock successful git tag command
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('git tag')) {
        return Buffer.from('test-go-project-v1.2.3');
      }
      return Buffer.from('');
    });

    // Setup console spies
    consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation((_message) => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console mocks
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('successfully publishes a Go module', async () => {
    const result = await runExecutor(options, context);

    // Verify execSync was called with the correct command
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining(
        'GOPROXY=proxy.golang.org go list -m github.com/testorg/test-go-project@test-go-project-v1.2.3'
      ),
      expect.anything()
    );

    expect(result.success).toBe(true);
  });

  it('handles dry run properly', async () => {
    const dryRunOptions = { ...options, dryRun: true };
    const result = await runExecutor(dryRunOptions, context);

    // Verify execSync was not called with the go list command
    expect(execSync).not.toHaveBeenCalledWith(
      expect.stringContaining('GOPROXY=proxy.golang.org go list -m'),
      expect.anything()
    );

    // Verify dry run message was logged
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Would run:')
    );

    expect(result.success).toBe(true);
  });

  it('handles env var NX_DRY_RUN properly', async () => {
    // Save the original env
    const originalEnv = process.env.NX_DRY_RUN;

    // Set the env var
    process.env.NX_DRY_RUN = 'true';

    try {
      const result = await runExecutor(options, context);

      // Verify execSync was not called with the go list command
      expect(execSync).not.toHaveBeenCalledWith(
        expect.stringContaining('GOPROXY=proxy.golang.org go list -m'),
        expect.anything()
      );

      expect(result.success).toBe(true);
    } finally {
      // Restore the original env
      process.env.NX_DRY_RUN = originalEnv;
    }
  });

  it('fails when project name is undefined', async () => {
    const badContext = { ...context, projectName: undefined };
    const result = await runExecutor(options, badContext);

    expect(result.success).toBe(false);
  });

  it('fails when project configuration is not found', async () => {
    const badContext = {
      ...context,
      projectName: 'non-existent-project',
    };
    const result = await runExecutor(options, badContext);

    expect(result.success).toBe(false);
  });

  it('fails when module name cannot be found in go.mod', async () => {
    // Mock go.mod without module line
    vi.mocked(readFileSync).mockReturnValueOnce(
      'go 1.20\n\nrequire (\n\tgithub.com/example/pkg v1.2.3\n)'
    );

    const result = await runExecutor(options, context);

    expect(result.success).toBe(false);
  });

  it('uses custom module root when specified', async () => {
    const customOptions = {
      ...options,
      moduleRoot: 'custom/module/path',
    };

    const result = await runExecutor(customOptions, context);

    // Verify readFileSync was called with the correct path
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('custom/module/path/go.mod'),
      expect.anything()
    );

    expect(result.success).toBe(true);
  });

  it('handles failure during publication', async () => {
    // Mock execSync to throw an error during the go list command
    vi.mocked(execSync)
      .mockImplementationOnce((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('git tag')) {
          return Buffer.from('test-go-project-v1.2.3');
        }
        return Buffer.from('');
      })
      .mockImplementationOnce(() => {
        throw new Error('Publication failed');
      });

    const result = await runExecutor(options, context);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Publication failed:',
      'Publication failed'
    );

    expect(result.success).toBe(false);
  });

  it('handles no matching tags gracefully', async () => {
    // Mock execSync to return empty string for git tag command
    vi.mocked(execSync).mockReturnValueOnce(Buffer.from(''));

    const result = await runExecutor(options, context);

    expect(result.success).toBe(false);
  });
});
