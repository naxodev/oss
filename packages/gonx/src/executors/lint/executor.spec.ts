import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutorContext } from '@nx/devkit';
import { LintExecutorSchema } from './schema';
import executor from './executor';
import { execSync } from 'child_process';

describe('Lint Executor', () => {
  const options: LintExecutorSchema = {};
  
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

  it('executes go fmt command successfully', async () => {
    const output = await executor(options, context);
    
    expect(execSync).toHaveBeenCalledWith(
      'go fmt ./...',
      expect.objectContaining({
        cwd: '/root/apps/test-project',
        stdio: 'inherit',
      })
    );
    
    expect(output.success).toBe(true);
  });

  it('uses custom linter when linter option is specified', async () => {
    const result = await executor(
      { ...options, linter: 'golangci-lint run' },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'golangci-lint run ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('appends arguments when args option is specified', async () => {
    const result = await executor(
      { ...options, args: ['-s', '--fix'] },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'go fmt -s --fix ./...',
      expect.anything()
    );
    
    expect(result.success).toBe(true);
  });

  it('combines custom linter and args correctly', async () => {
    const result = await executor(
      { 
        ...options, 
        linter: 'staticcheck',
        args: ['-checks=all', '-f=stylish'] 
      },
      context
    );
    
    expect(execSync).toHaveBeenCalledWith(
      'staticcheck -checks=all -f=stylish ./...',
      expect.anything()
    );
    
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