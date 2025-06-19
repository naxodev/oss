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
    extractCWD: jest.fn(
      (options: BuildExecutorSchema, context: ExecutorContext) => {
        if (options.main) {
          return 'apps/project/cmd';
        } else {
          return 'apps/project';
        }
      }
    ),
  };
});

const options: BuildExecutorSchema = {
  env: { hello: 'world' },
};

const context: ExecutorContext = {
  root: '.',
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
  it('should execute build command using the default options', async () => {
    await executor({}, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'dist/apps/project/', './...'],
      expect.objectContaining({ executable: 'go' })
    );
  });

  it('should execute build command using the main file', async () => {
    await executor(
      {
        main: './cmd/main.go',
      },
      context
    );
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'dist/apps/project/', './...'],
      expect.objectContaining({ executable: 'go' })
    );
  });

  it('should execute build command using TinyGo compiler', async () => {
    await executor({ ...options, compiler: 'tinygo' }, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'dist/apps/project/', './...'],
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

  it('should use "." as run path when main option is provided', async () => {
    await executor({ ...options, main: 'cmd/main.go' }, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'dist/apps/project/', '.'],
      expect.anything()
    );
  });

  it('should use "./..." as run path when main option is not provided', async () => {
    await executor(options, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'dist/apps/project/', './...'],
      expect.anything()
    );
  });

  it('should use "." as run path when main option is empty string', async () => {
    await executor({ ...options, main: '' }, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['build', '-o', 'dist/apps/project/', './...'],
      expect.anything()
    );
  });
});
