import { logger, ExecutorContext } from '@nx/devkit';
import * as child_process from 'child_process';
import {
  buildFlagIfEnabled,
  buildStringFlagIfValid,
  executeCommand,
  extractCWD,
  extractProjectRoot,
} from './execute-command';
import * as fileUtils from 'nx/src/utils/fileutils';

const mockFileUtils = jest.mocked(fileUtils);

jest.mock('@nx/devkit', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock('child_process');
jest.mock('nx/src/utils/fileutils', () => ({
  fileExists: jest.fn(),
}));

describe('Execute command', () => {
  describe('Method: extractProjectRoot', () => {
    it('should use project configuration to extract its root', () => {
      expect(
        extractProjectRoot({
          projectName: 'proj',
          cwd: '',
          isVerbose: false,
          root: '/root',
          projectsConfigurations: {
            projects: { proj: { root: '/root/project' } },
            version: 1,
          },
          nxJsonConfiguration: {},
          projectGraph: {
            nodes: {},
            dependencies: {},
          },
        })
      ).toBe('/root/project');
    });
  });

  describe('Method: executeCommand', () => {
    it('should execute a successfully command with default options', async () => {
      const result = await executeCommand(['build']);
      expect(result.success).toBeTruthy();
      expect(child_process.execSync).toHaveBeenCalledWith(
        'go build',
        expect.objectContaining({ cwd: null, env: process.env })
      );
      expect(logger.info).toHaveBeenCalledWith('Executing command: go build');
    });

    it('should execute a successfully command withh custom options', async () => {
      const result = await executeCommand(['build', '--flag1'], {
        executable: 'gow',
        cwd: '/root',
        env: { hello: 'world' },
      });
      expect(result.success).toBeTruthy();
      expect(child_process.execSync).toHaveBeenCalledWith(
        'gow build --flag1',
        expect.objectContaining({
          cwd: '/root',
          env: Object.assign(process.env, { hello: 'world' }),
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Executing command: gow build --flag1'
      );
    });

    it('should handle error when spawning a go command', async () => {
      const spawnError = new Error('spawn error');
      jest.spyOn(child_process, 'execSync').mockImplementationOnce(() => {
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
      root: '/workspace',
      isVerbose: false,
      projectName: 'my-project',
      projectsConfigurations: {
        projects: {
          'my-project': {
            root: 'apps/my-project',
            sourceRoot: 'apps/my-project',
          },
        },
      },
    } as unknown as ExecutorContext;

    beforeEach(() => {
      mockFileUtils.fileExists.mockClear();
    });

    it('should return project root when no main option is provided', () => {
      const result = extractCWD({}, context);
      expect(result).toBe('apps/my-project');
    });

    it('should return directory containing main.go when main option is provided', () => {
      mockFileUtils.fileExists.mockReturnValue(true);

      const result = extractCWD({ main: 'cmd/server/main.go' }, context);
      expect(result).toBe('apps/my-project/cmd/server');
      expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
        'apps/my-project/cmd/server/main.go'
      );
    });

    it('should throw error when main file does not exist', () => {
      mockFileUtils.fileExists.mockReturnValue(false);

      expect(() => extractCWD({ main: 'cmd/server/main.go' }, context)).toThrow(
        'Main file cmd/server/main.go does not exist in project my-project'
      );
    });

    it('should handle main file in project root', () => {
      mockFileUtils.fileExists.mockReturnValue(true);

      const result = extractCWD({ main: 'main.go' }, context);
      expect(result).toBe('apps/my-project');
      expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
        'apps/my-project/main.go'
      );
    });
  });
});
