import { ExecutorContext } from '@nx/devkit';
import * as sharedFunctions from '../../utils';
import executor from './executor';
import { GenerateExecutorSchema } from './schema';

jest.mock('../../utils', () => {
  return {
    executeCommand: jest.fn().mockResolvedValue({ success: true }),
    extractCWD: jest.fn(() => 'apps/project'),
  };
});

const options: GenerateExecutorSchema = {
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

describe('Generate Executor', () => {
  it('should execute generate command using the default options', async () => {
    await executor({}, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['generate', './...'],
      expect.objectContaining({ executable: 'go' })
    );
  });

  it('should execute generate command with custom flags', async () => {
    await executor({ ...options, flags: ['-v', '-x'] }, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['generate', '-v', '-x', './...'],
      expect.anything()
    );
  });

  it('should execute generate command with environment variables', async () => {
    const envOptions = { env: { GOPATH: '/custom/gopath', CGO_ENABLED: '0' } };
    await executor(envOptions, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['generate', './...'],
      expect.objectContaining({
        env: { GOPATH: '/custom/gopath', CGO_ENABLED: '0' },
        executable: 'go',
      })
    );
  });

  it('should execute generate command with both flags and environment variables', async () => {
    const combinedOptions = {
      flags: ['-v'],
      env: { GOARCH: 'arm64' },
    };
    await executor(combinedOptions, context);
    expect(sharedFunctions.executeCommand).toHaveBeenCalledWith(
      ['generate', '-v', './...'],
      expect.objectContaining({
        env: { GOARCH: 'arm64' },
        executable: 'go',
      })
    );
  });

  it('should call extractCWD with correct parameters', async () => {
    await executor(options, context);
    expect(sharedFunctions.extractCWD).toHaveBeenCalledWith(options, context);
  });
});
