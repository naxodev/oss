import {
  describe,
  it,
  expect,
  mock,
  spyOn,
  beforeEach,
  type Mock,
} from 'bun:test';
import { logger, ExecutorContext } from '@nx/devkit';
import * as child_process from 'child_process';
import * as path from 'path';
import {
  buildFlagIfEnabled,
  buildStringFlagIfValid,
  executeCommand,
  extractCWD,
  getProjectRoot,
  getRunPath,
} from './execute-command';
import * as fileUtils from 'nx/src/utils/fileutils';

mock.module('@nx/devkit', () => ({
  logger: { info: mock(), error: mock() },
}));
mock.module('child_process', () => ({
  execFileSync: mock(),
}));
mock.module('nx/src/utils/fileutils', () => ({
  fileExists: mock(),
}));

const mockFileUtils = fileUtils as unknown as {
  fileExists: Mock<() => boolean>;
};

describe('Execute command', () => {
  describe('Method: getProjectRoot', () => {
    it('should use project configuration to extract its root', () => {
      expect(
        getProjectRoot({
          projectName: 'proj',
          cwd: '',
          isVerbose: false,
          root: path.sep + 'root',
          projectsConfigurations: {
            projects: {
              proj: { root: path.join(path.sep + 'root', 'project') },
            },
            version: 1,
          },
          nxJsonConfiguration: {},
          projectGraph: {
            nodes: {},
            dependencies: {},
          },
        })
      ).toBe(path.join(path.sep + 'root', 'project'));
    });

    it('should throw a clear error when the project name is missing', () => {
      expect(() =>
        getProjectRoot({
          projectsConfigurations: { projects: {}, version: 1 },
        } as unknown as ExecutorContext)
      ).toThrow('Project name is not provided');
    });

    it('should throw a clear error when the project configuration is missing', () => {
      expect(() =>
        getProjectRoot({
          projectName: 'ghost',
          projectsConfigurations: { projects: {}, version: 1 },
        } as unknown as ExecutorContext)
      ).toThrow('Cannot find project root for ghost');
    });
  });

  describe('Method: getRunPath', () => {
    it('should target the current directory when main is provided', () => {
      expect(getRunPath({ main: 'cmd/main.go' })).toBe('.');
    });

    it('should target every package when main is not provided', () => {
      expect(getRunPath({})).toBe('./...');
    });

    it('should target every package when main is an empty string', () => {
      expect(getRunPath({ main: '' })).toBe('./...');
    });
  });

  describe('Method: executeCommand', () => {
    it('should execute a successfully command with default options', async () => {
      const result = await executeCommand(['build']);
      expect(result.success).toBeTruthy();
      expect(child_process.execFileSync).toHaveBeenCalledWith(
        'go',
        ['build'],
        expect.objectContaining({ cwd: null, env: { ...process.env } })
      );
      expect(logger.info).toHaveBeenCalledWith('Executing command: go build');
    });

    it('should execute a successfully command withh custom options', async () => {
      const result = await executeCommand(['build', '--flag1'], {
        executable: 'gow',
        cwd: path.sep + 'root',
        env: { hello: 'world' },
      });
      expect(result.success).toBeTruthy();
      expect(child_process.execFileSync).toHaveBeenCalledWith(
        'gow',
        ['build', '--flag1'],
        expect.objectContaining({
          cwd: path.sep + 'root',
          env: { ...process.env, hello: 'world' },
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Executing command: gow build --flag1'
      );
    });

    it('should not mutate process.env with the provided env', async () => {
      // Env leakage matters: inside the long-lived Nx daemon the same process
      // runs many executors, so a mutation here would bleed into later runs.
      await executeCommand(['build'], { env: { GONX_TEST_LEAK: 'yes' } });

      expect(process.env.GONX_TEST_LEAK).toBeUndefined();
      expect(child_process.execFileSync).toHaveBeenCalledWith(
        'go',
        ['build'],
        expect.objectContaining({
          env: expect.objectContaining({ GONX_TEST_LEAK: 'yes' }),
        })
      );
    });

    it('should tokenize a multi-word executable into file + leading argv', async () => {
      const result = await executeCommand(['./...'], {
        executable: 'go fmt',
      });
      expect(result.success).toBeTruthy();
      expect(child_process.execFileSync).toHaveBeenCalledWith(
        'go',
        ['fmt', './...'],
        expect.objectContaining({ cwd: null })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Executing command: go fmt ./...'
      );
    });

    it('should leave a single-word executable unchanged', async () => {
      const result = await executeCommand(['build'], { executable: 'go' });
      expect(result.success).toBeTruthy();
      expect(child_process.execFileSync).toHaveBeenCalledWith(
        'go',
        ['build'],
        expect.objectContaining({ cwd: null })
      );
    });

    it('should handle extra/irregular whitespace in a multi-word executable', async () => {
      const result = await executeCommand(['./...'], {
        executable: '  go   fmt  ',
      });
      expect(result.success).toBeTruthy();
      expect(child_process.execFileSync).toHaveBeenCalledWith(
        'go',
        ['fmt', './...'],
        expect.objectContaining({ cwd: null })
      );
    });

    it('should pass a parameter containing spaces as a single argv token', async () => {
      const result = await executeCommand(
        ['build', '-ldflags=-X main.version=1.2.3', './...'],
        { executable: 'go' }
      );
      expect(result.success).toBeTruthy();
      expect(child_process.execFileSync).toHaveBeenCalledWith(
        'go',
        ['build', '-ldflags=-X main.version=1.2.3', './...'],
        expect.objectContaining({ cwd: null })
      );
    });

    it('should handle error when spawning a go command', async () => {
      const spawnError = new Error('spawn error');
      spyOn(child_process, 'execFileSync').mockImplementationOnce(() => {
        throw spawnError;
      });
      const result = await executeCommand(['version']);

      expect(result.success).toBeFalsy();
      expect(logger.error).toHaveBeenCalledWith(spawnError);
      expect(logger.info).toHaveBeenCalledWith('Executing command: go version');
    });
  });

  describe('Method: buildFlagIfEnabled', () => {
    it('should add a flag because enabled', () => {
      expect(buildFlagIfEnabled('--flag1', true)).toEqual(['--flag1']);
    });

    it('should not add a flag because not enabled', () => {
      expect(buildFlagIfEnabled('--flag1', false)).toEqual([]);
    });
  });

  describe('Method: buildStringFlagIfValid', () => {
    it('should add a flag because valid', () => {
      expect(buildStringFlagIfValid('--flag1', 'v1')).toEqual(['--flag1=v1']);
    });

    it('should not add a flag because not valid', () => {
      expect(buildStringFlagIfValid('--flag1')).toEqual([]);
    });
  });

  describe('Method: extractCWD', () => {
    const context: ExecutorContext = {
      root: path.sep + 'workspace',
      isVerbose: false,
      projectName: 'my-project',
      projectsConfigurations: {
        projects: {
          'my-project': {
            root: path.join('apps', 'my-project'),
            sourceRoot: path.join('apps', 'my-project'),
          },
        },
      },
    } as unknown as ExecutorContext;

    beforeEach(() => {
      mockFileUtils.fileExists.mockClear();
    });

    it('should return project root when no main option is provided', () => {
      const result = extractCWD({}, context);
      expect(result).toBe(path.join('apps', 'my-project'));
    });

    it('should return directory containing main.go when main option is provided', () => {
      mockFileUtils.fileExists.mockReturnValue(true);

      const result = extractCWD(
        { main: path.join('cmd', 'server', 'main.go') },
        context
      );
      expect(result).toBe(path.join('apps', 'my-project', 'cmd', 'server'));
      expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
        path.join('apps', 'my-project', 'cmd', 'server', 'main.go')
      );
    });

    it('should throw error when main file does not exist', () => {
      mockFileUtils.fileExists.mockReturnValue(false);

      expect(() =>
        extractCWD({ main: path.join('cmd', 'server', 'main.go') }, context)
      ).toThrow(
        'Main file ' +
          path.join('cmd', 'server', 'main.go') +
          ' does not exist in project my-project'
      );
    });

    it('should handle main file in project root', () => {
      mockFileUtils.fileExists.mockReturnValue(true);

      const result = extractCWD({ main: 'main.go' }, context);
      expect(result).toBe(path.join('apps', 'my-project'));
      expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
        path.join('apps', 'my-project', 'main.go')
      );
    });
  });
});
