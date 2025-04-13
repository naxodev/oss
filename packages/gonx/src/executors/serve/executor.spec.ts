import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutorContext } from '@nx/devkit';
import * as childProcess from 'child_process';
import { EventEmitter } from 'events';
import { ServeExecutorSchema } from './schema';
import executor from './executor';

// Create a mock process with EventEmitter for testing
class MockProcess extends EventEmitter {
  kill = vi.fn();
  killed = false;
}

// Mock child_process methods
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    spawn: vi.fn(),
    default: {
      ...actual.default,
      spawn: vi.fn(),
    },
  };
});

describe('Serve Executor', () => {
  let mockProcess: MockProcess;

  const options: ServeExecutorSchema = {
    main: 'main.go',
  };

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

    // Set up mock process
    mockProcess = new MockProcess();
    childProcess.spawn = vi.fn().mockReturnValue(mockProcess as any);
  });

  it('can run and succeed', async () => {
    // Create a pending promise that will be resolved by the event
    const executorPromise = executor(options, context);

    // Verify spawn was called with the right arguments
    expect(childProcess.spawn).toHaveBeenCalledWith(
      'go',
      ['run', 'main.go'],
      expect.objectContaining({
        cwd: '/root/apps/test-project',
        stdio: 'inherit',
      })
    );

    // Simulate process exit with success
    mockProcess.emit('exit', 0);

    const result = await executorPromise;
    expect(result.success).toBe(true);
  });

  it('handles custom cmd option', async () => {
    const executorPromise = executor({ ...options, cmd: 'go1.24' }, context);

    expect(childProcess.spawn).toHaveBeenCalledWith(
      'go1.24',
      ['run', 'main.go'],
      expect.anything()
    );

    mockProcess.emit('exit', 0);
    const result = await executorPromise;
    expect(result.success).toBe(true);
  });

  it('handles custom cwd option', async () => {
    const executorPromise = executor(
      { ...options, cwd: 'custom/path' },
      context
    );

    expect(childProcess.spawn).toHaveBeenCalledWith(
      'go',
      ['run', 'main.go'],
      expect.objectContaining({
        cwd: '/root/custom/path',
      })
    );

    mockProcess.emit('exit', 0);
    const result = await executorPromise;
    expect(result.success).toBe(true);
  });

  it('handles args option', async () => {
    const executorPromise = executor(
      { ...options, args: ['--port=8080', '--debug'] },
      context
    );

    expect(childProcess.spawn).toHaveBeenCalledWith(
      'go',
      ['run', 'main.go', '--port=8080', '--debug'],
      expect.anything()
    );

    mockProcess.emit('exit', 0);
    const result = await executorPromise;
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

  it('handles process error', async () => {
    const executorPromise = executor(options, context);

    // Simulate process error
    mockProcess.emit('error', new Error('Process failed'));

    await expect(executorPromise).rejects.toEqual('Process failed');
  });

  it('handles non-zero exit code', async () => {
    const executorPromise = executor(options, context);

    // Simulate process exit with non-zero code
    mockProcess.emit('exit', 1);

    await expect(executorPromise).rejects.toEqual('Process exited with code 1');
  });
});
