import { describe, it, expect, mock, spyOn } from 'bun:test';
import { ExecutorContext } from '@nx/devkit';
import * as commonFunctions from '../../utils';
import executor from './executor';

mock.module('../../utils', () => ({
  executeCommand: mock().mockResolvedValue({ success: true }),
  extractProjectRoot: mock(() => 'apps/project'),
  extractCWD: mock((options: any) => {
    if (options.main) {
      return 'apps/project/cmd';
    } else {
      return 'apps/project';
    }
  }),
}));

const context: ExecutorContext = {
  cwd: 'current-dir',
  root: '',
  isVerbose: false,
  projectName: 'project',
  projectsConfigurations: {
    projects: {
      project: {
        root: 'apps/project',
        sourceRoot: 'apps/project',
      },
    },
  },
} as unknown as ExecutorContext;

describe('Serve Executor', () => {
  it('should run Go program with default parameters', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({}, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', './...'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });

  it('should run Go program with custom args', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({ args: ['--help'] }, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', './...', '--help'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });

  it('should run Go program with custom executable', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({ cmd: 'tinygo' }, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(
      ['run', './...'],
      expect.objectContaining({ executable: 'tinygo' })
    );
  });

  it('should remove directory from main file path', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({}, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', './...'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });

  it('should use "." as run path when main option is provided', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({ main: 'cmd/main.go' }, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', '.'], {
      cwd: 'apps/project/cmd',
      executable: 'go',
    });
  });

  it('should use "./..." as run path when main option is not provided', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({}, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', './...'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });

  it('should use "./..." as run path when main option is empty string', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({ main: '' }, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', './...'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });

  it('should use "." as run path when main option is provided with custom args', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor(
      { main: 'cmd/main.go', args: ['--help'] },
      context
    );
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', '.', '--help'], {
      cwd: 'apps/project/cmd',
      executable: 'go',
    });
  });
});
