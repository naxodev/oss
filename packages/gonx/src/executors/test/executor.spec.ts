import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutorContext } from '@nx/devkit';
import { TestExecutorSchema } from './schema';
import executor from './executor';
import { execSync } from 'child_process';

describe('Test Executor', () => {
  const options: TestExecutorSchema = {};
  
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
          targets: {}
        }
      },
      version: 2,
    },
    nxJsonConfiguration: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes go test command successfully', async () => {
    const output = await executor(options, context);
    
    expect(execSync).toHaveBeenCalledWith(
      'go test ./...',
      expect.objectContaining({
        cwd: '/root/apps/test-project',
        stdio: 'inherit',
      })
    );
    
    expect(output.success).toBe(true);
  });

  it('enables code coverage when cover option is true', async () => {
    const result = await executor(
      { ...options, cover: true },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go test -cover ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('specifies coverage profile output when coverProfile option is set', async () => {
    const result = await executor(
      { ...options, coverProfile: 'coverage.out' },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go test -coverprofile=coverage.out ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('enables race detection when race option is true', async () => {
    const result = await executor(
      { ...options, race: true },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go test -race ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('filters tests by pattern when run option is set', async () => {
    const result = await executor(
      { ...options, run: 'TestFunction' },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go test -run=TestFunction ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('enables verbose output when verbose option is true', async () => {
    const result = await executor(
      { ...options, verbose: true },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go test -v ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('sets test count when count option is specified', async () => {
    const result = await executor(
      { ...options, count: 3 },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go test -count=3 ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('sets test timeout when timeout option is specified', async () => {
    const result = await executor(
      { ...options, timeout: '30s' },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go test -timeout=30s ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('combines multiple options correctly', async () => {
    const result = await executor(
      { 
        ...options, 
        verbose: true,
        cover: true,
        race: true,
        timeout: '60s'
      },
      context
    );
    
    // Instead of checking exact order, check that the command contains all the expected flags
    expect(execSync).toHaveBeenCalled();
    const callArg = vi.mocked(execSync).mock.calls[0][0] as string;
    expect(callArg).toContain('go test');
    expect(callArg).toContain('-v');
    expect(callArg).toContain('-cover');
    expect(callArg).toContain('-race');
    expect(callArg).toContain('-timeout=60s');
    expect(callArg).toContain('./...');
    
    expect(result.success).toBe(true);
  });

  it('throws error when project name is missing', async () => {
    const badContext = { ...context, projectName: undefined };
    await expect(executor(options, badContext)).rejects.toThrow('No project name provided');
  });

  it('throws error when project root cannot be found', async () => {
    const badContext = {
      ...context,
      projectName: 'non-existent',
      projectsConfigurations: {
        ...context.projectsConfigurations,
        projects: {}
      }
    };
    
    await expect(executor(options, badContext)).rejects.toThrow('Cannot find project root for non-existent');
  });

  it('handles command execution error properly', async () => {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Command failed');
    });
    
    await expect(executor(options, context)).rejects.toThrow('Command failed');
  });
});