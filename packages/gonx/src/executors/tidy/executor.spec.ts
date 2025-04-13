import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutorContext } from '@nx/devkit';
import * as childProcess from 'child_process';
import { TidyExecutorSchema } from './schema';
import executor from './executor';

// Mock child_process methods
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    execSync: vi.fn(),
    default: {
      ...actual.default,
      execSync: vi.fn(),
    },
  };
});

describe('Tidy Executor', () => {
  const options: TidyExecutorSchema = {};

  const context: ExecutorContext = {
    root: '/root',
    cwd: '/root',
    isVerbose: false,
    projectName: 'test-project',
    projectGraph: {
      nodes: {},
      dependencies: {},
    },
    projectsConfigurations: {
      projects: {
        'test-project': {
          root: 'apps/test-project',
          sourceRoot: 'apps/test-project',
          projectType: 'application',
          targets: {},
        },
      },
      version: 2,
    },
    nxJsonConfiguration: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful command execution
    childProcess.execSync = vi.fn().mockReturnValue(Buffer.from(''));
  });

  it('can run', async () => {
    const output = await executor(options, context);

    // Verify execution
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'go mod tidy',
      expect.objectContaining({
        cwd: '/root/apps/test-project',
        stdio: 'inherit',
      })
    );

    expect(output.success).toBe(true);
  });

  it('handles verbose option', async () => {
    const result = await executor({ ...options, verbose: true }, context);

    expect(childProcess.execSync).toHaveBeenCalledWith(
      'go mod tidy -v',
      expect.anything()
    );

    expect(result.success).toBe(true);
  });

  it('throws error when no project name is provided', async () => {
    const badContext = { ...context, projectName: undefined };
    await expect(executor(options, badContext)).rejects.toThrow(
      'No project name provided'
    );
  });

  it('throws error when project root cannot be found', async () => {
    const badContext = {
      ...context,
      projectName: 'non-existent',
      projectsConfigurations: {
        ...context.projectsConfigurations,
        projects: {},
      },
    };

    await expect(executor(options, badContext)).rejects.toThrow(
      'Cannot find project root for non-existent'
    );
  });

  it('handles command execution error', async () => {
    // Mock command execution failure
    childProcess.execSync = vi.fn().mockImplementation(() => {
      throw new Error('Command failed');
    });

    await expect(executor(options, context)).rejects.toThrow('Command failed');
  });
});
