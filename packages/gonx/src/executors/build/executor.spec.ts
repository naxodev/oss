import { ExecutorContext } from '@nx/devkit';
import * as sharedFunctions from '../../utils';
import executor from './executor';
import { BuildExecutorSchema } from './schema';

jest.mock('../../utils', () => {
  const { buildStringFlagIfValid } = jest.requireActual('../../utils');
  return {
    buildStringFlagIfValid,
    executeCommand: jest.fn().mockResolvedValue({ success: true }),
    extractProjectRoot: jest.fn(() => 'apps/project'),
  };
});

const options: BuildExecutorSchema = {
  env: { hello: 'world' },
};

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

describe('Build Executor', () => {
  it.each`
    platform   | outputPath
    ${'win32'} | ${'dist/apps/project.exe'}
    ${'linux'} | ${'dist/apps/project'}
  `(
    'should execute build command on platform $platform',
    async ({ platform, outputPath }) => {
      Object.defineProperty(process, 'platform', { value: platform });
      const output = await executor(options, context);
      expect(output.success).toBeTruthy();
      expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
        ['build', '-o', outputPath, './...'],
        { cwd: 'apps/project', env: { hello: 'world' }, executable: 'go' }
      );
    }
  );

  it('should execute build command using TinyGo compiler', async () => {
    await executor({ ...options, compiler: 'tinygo' }, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'dist/apps/project', './...'],
      expect.objectContaining({ executable: 'tinygo' })
    );
  });

  it('should execute build command with custom output path and flags', async () => {
    await executor(
      { ...options, outputPath: 'custom-path', flags: ['--flag1'] },
      context
    );
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'custom-path', '--flag1', './...'],
      expect.anything()
    );
  });

  it.each`
    config                       | flag
    ${{ buildMode: 'c-shared' }} | ${'-buildmode=c-shared'}
  `('should add flag $flag if enabled', async ({ config, flag }) => {
    expect(
      (await executor({ ...options, ...config }, context)).success
    ).toBeTruthy();
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      expect.arrayContaining([flag]),
      expect.anything()
    );
  });
});
