import { ExecutorContext } from '@nx/devkit';
import * as commonFunctions from '../../utils';
import executor from './executor';

jest.mock('../../utils', () => ({
  executeCommand: jest.fn().mockResolvedValue({ success: true }),
  extractProjectRoot: jest.fn(() => 'apps/project'),
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
    const spyExecute = jest.spyOn(commonFunctions, 'executeCommand');
    const output = await executor({}, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', '.'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });

  it('should run Go program with custom args', async () => {
    const spyExecute = jest.spyOn(commonFunctions, 'executeCommand');
    const output = await executor({ args: ['--help'] }, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', '.', '--help'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });

  it('should run Go program with custom executable', async () => {
    const spyExecute = jest.spyOn(commonFunctions, 'executeCommand');
    const output = await executor({ cmd: 'tinygo' }, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(
      ['run', '.'],
      expect.objectContaining({ executable: 'tinygo' })
    );
  });

  it('should remove directory from main file path', async () => {
    const spyExecute = jest.spyOn(commonFunctions, 'executeCommand');
    const output = await executor({}, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['run', '.'], {
      cwd: 'apps/project',
      executable: 'go',
    });
  });
});
