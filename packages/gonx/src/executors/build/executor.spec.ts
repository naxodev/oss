import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutorContext } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';
import executor from './executor';
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
  });

  it('executes go build command successfully', async () => {
    const output = await executor(options, context);

    expect(execSync).toHaveBeenCalledWith(
      'go build main.go',
      expect.objectContaining({
        cwd: '/root/apps/test-project',
        stdio: 'inherit',
      })
    );

    expect(output.success).toBe(true);
  });

  it('uses custom compiler when specified', async () => {
    const result = await executor({ ...options, compiler: 'go1.24' }, context);

    expect(execSync).toHaveBeenCalledWith(
      'go1.24 build main.go',
      expect.anything()
    );

    expect(result.success).toBe(true);
  });

  it('uses output path when specified', async () => {
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

  it('applies buildMode option correctly', async () => {
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

  it('includes custom flags when specified', async () => {
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

  it('applies environment variables to the command', async () => {
    const result = await executor(
      { 
        ...options, 
        env: { 
          CGO_ENABLED: '1',
          GOOS: 'linux'
        } 
      },
      context
    );

    expect(execSync).toHaveBeenCalledWith(
      'go build main.go',
      expect.objectContaining({
        env: expect.objectContaining({
          CGO_ENABLED: '1',
          GOOS: 'linux'
        })
      })
    );

    expect(result.success).toBe(true);
  });

  it('throws error when project name is missing', async () => {
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

  it('handles command execution error properly', async () => {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Command failed');
    });

    await expect(executor(options, context)).rejects.toThrow('Command failed');
  });
});