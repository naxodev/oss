import { ProjectConfiguration } from '@nx/devkit';
import { buildImportMap } from './build-import-map';
import { parseGoMod } from './parse-go-mod';
import { GoModInfo } from '../types/go-mod-info';

jest.mock('./parse-go-mod');

const mockParseGoMod = parseGoMod as jest.MockedFunction<typeof parseGoMod>;

function goMod(
  modulePath: string,
  replaces?: Record<string, string>
): GoModInfo {
  return {
    modulePath,
    replaceDirectives: new Map(Object.entries(replaces ?? {})),
  };
}

describe('buildImportMap', () => {
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseGoMod.mockResolvedValue(null);
  });

  describe('base import map', () => {
    it('should map module path to project name', async () => {
      mockParseGoMod.mockImplementation(async (filePath) => {
        if (filePath === '/workspace/libs/shared/go.mod') {
          return goMod('github.com/myorg/shared');
        }
        return null;
      });

      const projects: Record<string, ProjectConfiguration> = {
        'libs/shared': { root: 'libs/shared' },
      };

      const result = await buildImportMap(projects, workspaceRoot);

      expect(result.baseImportMap.get('github.com/myorg/shared')).toBe(
        'libs/shared'
      );
    });

    it('should map multiple projects', async () => {
      mockParseGoMod.mockImplementation(async (filePath) => {
        if (filePath === '/workspace/apps/api/go.mod') {
          return goMod('github.com/myorg/api');
        }
        if (filePath === '/workspace/libs/shared/go.mod') {
          return goMod('github.com/myorg/shared');
        }
        if (filePath === '/workspace/libs/utils/go.mod') {
          return goMod('github.com/myorg/utils');
        }
        return null;
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
        'libs/shared': { root: 'libs/shared' },
        'libs/utils': { root: 'libs/utils' },
      };

      const result = await buildImportMap(projects, workspaceRoot);

      expect(result.baseImportMap.size).toBe(3);
      expect(result.baseImportMap.get('github.com/myorg/api')).toBe('apps/api');
      expect(result.baseImportMap.get('github.com/myorg/shared')).toBe(
        'libs/shared'
      );
      expect(result.baseImportMap.get('github.com/myorg/utils')).toBe(
        'libs/utils'
      );
    });

    it('should skip projects without go.mod', async () => {
      mockParseGoMod.mockImplementation(async (filePath) => {
        if (filePath === '/workspace/libs/shared/go.mod') {
          return goMod('github.com/myorg/shared');
        }
        return null;
      });

      const projects: Record<string, ProjectConfiguration> = {
        'libs/shared': { root: 'libs/shared' },
        'libs/js-lib': { root: 'libs/js-lib' },
      };

      const result = await buildImportMap(projects, workspaceRoot);

      expect(result.baseImportMap.size).toBe(1);
      expect(result.baseImportMap.get('github.com/myorg/shared')).toBe(
        'libs/shared'
      );
    });
  });

  describe('replace directive handling', () => {
    it('should resolve replace directive to target module path', async () => {
      mockParseGoMod.mockImplementation(async (filePath) => {
        if (filePath === '/workspace/apps/api/go.mod') {
          return goMod('github.com/myorg/api', {
            'github.com/external/common': '../common',
          });
        }
        if (filePath === '/workspace/apps/common/go.mod') {
          return goMod('github.com/myorg/common');
        }
        return null;
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
        'apps/common': { root: 'apps/common' },
      };

      const result = await buildImportMap(projects, workspaceRoot);

      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces).toBeDefined();
      expect(apiReplaces!.get('github.com/external/common')).toEqual({
        kind: 'remap',
        to: 'github.com/myorg/common',
      });
    });

    it('should set suppress for local path pointing to non-Nx directory', async () => {
      mockParseGoMod.mockImplementation(async (filePath) => {
        if (filePath === '/workspace/apps/api/go.mod') {
          return goMod('github.com/myorg/api', {
            'github.com/vendor/pkg': './vendor/pkg',
          });
        }
        return null;
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
      };

      const result = await buildImportMap(projects, workspaceRoot);

      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces).toBeDefined();
      expect(apiReplaces!.get('github.com/vendor/pkg')).toEqual({
        kind: 'suppress',
      });
    });

    it('should handle module-to-module replacement', async () => {
      mockParseGoMod.mockImplementation(async (filePath) => {
        if (filePath === '/workspace/apps/api/go.mod') {
          return goMod('github.com/myorg/api', {
            'github.com/old/pkg': 'github.com/new/pkg',
          });
        }
        return null;
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
      };

      const result = await buildImportMap(projects, workspaceRoot);

      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces).toBeDefined();
      expect(apiReplaces!.get('github.com/old/pkg')).toEqual({
        kind: 'remap',
        to: 'github.com/new/pkg',
      });
    });

    it('should scope replace directives per project', async () => {
      mockParseGoMod.mockImplementation(async (filePath) => {
        if (filePath === '/workspace/apps/api/go.mod') {
          return goMod('github.com/myorg/api', {
            'github.com/myorg/common': '../common',
          });
        }
        if (filePath === '/workspace/apps/web/go.mod') {
          return goMod('github.com/myorg/web', {
            'github.com/myorg/common': '../../libs/common',
          });
        }
        if (filePath === '/workspace/apps/common/go.mod') {
          return goMod('github.com/myorg/apps-common');
        }
        if (filePath === '/workspace/libs/common/go.mod') {
          return goMod('github.com/myorg/libs-common');
        }
        return null;
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
        'apps/web': { root: 'apps/web' },
        'apps/common': { root: 'apps/common' },
        'libs/common': { root: 'libs/common' },
      };

      const result = await buildImportMap(projects, workspaceRoot);

      expect(result.projectReplaceDirectives.has('apps/api')).toBe(true);
      expect(result.projectReplaceDirectives.has('apps/web')).toBe(true);

      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces!.get('github.com/myorg/common')).toEqual({
        kind: 'remap',
        to: 'github.com/myorg/apps-common',
      });

      const webReplaces = result.projectReplaceDirectives.get('apps/web');
      expect(webReplaces!.get('github.com/myorg/common')).toEqual({
        kind: 'remap',
        to: 'github.com/myorg/libs-common',
      });
    });
  });
});
