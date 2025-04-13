import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutorContext } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';
import executor from './executor';

// Mock the entire child_process module
vi.mock('child_process', () => {
  return {
    execSync: vi.fn(),
  };
});

import { execSync } from 'child_process';

describe('Build Executor', () => {
  const options: BuildExecutorSchema = {
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
    // Mock successful command execution
    (execSync as any).mockReturnValue(Buffer.from(''));
  });

  it('can run', async () => {
    const output = await executor(options, context);

    // Verify execution
    expect(execSync).toHaveBeenCalledWith(
      'go build main.go',
      expect.objectContaining({
        cwd: '/root/apps/test-project',
        stdio: 'inherit',
      })
    );

    expect(output.success).toBe(true);
  });

  it('handles compiler option', async () => {
    const result = await executor({ ...options, compiler: 'go1.24' }, context);

    expect(execSync).toHaveBeenCalledWith(
      'go1.24 build main.go',
      expect.anything()
    );

    expect(result.success).toBe(true);
  });

  it('handles outputPath option', async () => {
    const result = await executor(
      { ...options, outputPath: 'bin/app' },
      context
    );

    expect(execSync).toHaveBeenCalledWith(
      'go build -o bin/app main.go',
      expect.anything()
    );

    expect(result.success).toBe(true);
  });

  it('handles buildMode option', async () => {
    const result = await executor(
      { ...options, buildMode: 'c-shared' },
      context
    );

    expect(execSync).toHaveBeenCalledWith(
      'go build -buildmode=c-shared main.go',
      expect.anything()
    );

    expect(result.success).toBe(true);
  });

  it('handles flags option', async () => {
    const result = await executor(
      { ...options, flags: ['-race', '-v'] },
      context
    );

    expect(execSync).toHaveBeenCalledWith(
      'go build -race -v main.go',
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
    (execSync as any).mockImplementation(() => {
      throw new Error('Command failed');
    });

    await expect(executor(options, context)).rejects.toThrow('Command failed');
  });
});
