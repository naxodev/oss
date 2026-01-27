import { vol } from 'memfs';
import { ProjectConfiguration } from '@nx/devkit';
import { buildImportMap } from './build-import-map';

jest.mock('fs', () => require('memfs').fs);

describe('buildImportMap', () => {
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    vol.reset();
  });

  describe('base import map', () => {
    it('should map module path to project name', () => {
      vol.fromJSON({
        '/workspace/libs/shared/go.mod':
          'module github.com/myorg/shared\n\ngo 1.21',
      });

      const projects: Record<string, ProjectConfiguration> = {
        'libs/shared': { root: 'libs/shared' },
      };

      const result = buildImportMap(projects, workspaceRoot);

      expect(result.baseImportMap.get('github.com/myorg/shared')).toBe(
        'libs/shared'
      );
    });

    it('should map multiple projects', () => {
      vol.fromJSON({
        '/workspace/apps/api/go.mod': 'module github.com/myorg/api\n\ngo 1.21',
        '/workspace/libs/shared/go.mod':
          'module github.com/myorg/shared\n\ngo 1.21',
        '/workspace/libs/utils/go.mod':
          'module github.com/myorg/utils\n\ngo 1.21',
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
        'libs/shared': { root: 'libs/shared' },
        'libs/utils': { root: 'libs/utils' },
      };

      const result = buildImportMap(projects, workspaceRoot);

      expect(result.baseImportMap.size).toBe(3);
      expect(result.baseImportMap.get('github.com/myorg/api')).toBe('apps/api');
      expect(result.baseImportMap.get('github.com/myorg/shared')).toBe(
        'libs/shared'
      );
      expect(result.baseImportMap.get('github.com/myorg/utils')).toBe(
        'libs/utils'
      );
    });

    it('should skip projects without go.mod', () => {
      vol.fromJSON({
        '/workspace/libs/shared/go.mod':
          'module github.com/myorg/shared\n\ngo 1.21',
        '/workspace/libs/js-lib/package.json': '{"name": "js-lib"}',
      });

      const projects: Record<string, ProjectConfiguration> = {
        'libs/shared': { root: 'libs/shared' },
        'libs/js-lib': { root: 'libs/js-lib' },
      };

      const result = buildImportMap(projects, workspaceRoot);

      expect(result.baseImportMap.size).toBe(1);
      expect(result.baseImportMap.get('github.com/myorg/shared')).toBe(
        'libs/shared'
      );
    });
  });

  describe('replace directive handling', () => {
    it('should resolve replace directive to target module path', () => {
      vol.fromJSON({
        '/workspace/apps/api/go.mod': `
module github.com/myorg/api

replace github.com/external/common => ../common
`,
        '/workspace/apps/common/go.mod':
          'module github.com/myorg/common\n\ngo 1.21',
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
        'apps/common': { root: 'apps/common' },
      };

      const result = buildImportMap(projects, workspaceRoot);

      // The replace directive maps github.com/external/common (the replaced path)
      // to github.com/myorg/common (the actual module path in the target's go.mod)
      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces).toBeDefined();
      expect(apiReplaces!.get('github.com/external/common')).toBe(
        'github.com/myorg/common'
      );
    });

    it('should set null for local path pointing to non-Nx directory', () => {
      vol.fromJSON({
        '/workspace/apps/api/go.mod': `
module github.com/myorg/api

replace github.com/vendor/pkg => ./vendor/pkg
`,
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
      };

      const result = buildImportMap(projects, workspaceRoot);

      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces).toBeDefined();
      expect(apiReplaces!.get('github.com/vendor/pkg')).toBeNull();
    });

    it('should handle module-to-module replacement', () => {
      vol.fromJSON({
        '/workspace/apps/api/go.mod': `
module github.com/myorg/api

replace github.com/old/pkg => github.com/new/pkg
`,
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
      };

      const result = buildImportMap(projects, workspaceRoot);

      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces).toBeDefined();
      expect(apiReplaces!.get('github.com/old/pkg')).toBe('github.com/new/pkg');
    });

    it('should scope replace directives per project', () => {
      vol.fromJSON({
        '/workspace/apps/api/go.mod': `
module github.com/myorg/api

replace github.com/myorg/common => ../common
`,
        '/workspace/apps/web/go.mod': `
module github.com/myorg/web

replace github.com/myorg/common => ../../libs/common
`,
        // Different module paths to verify distinct resolution targets
        '/workspace/apps/common/go.mod':
          'module github.com/myorg/apps-common\n\ngo 1.21',
        '/workspace/libs/common/go.mod':
          'module github.com/myorg/libs-common\n\ngo 1.21',
      });

      const projects: Record<string, ProjectConfiguration> = {
        'apps/api': { root: 'apps/api' },
        'apps/web': { root: 'apps/web' },
        'apps/common': { root: 'apps/common' },
        'libs/common': { root: 'libs/common' },
      };

      const result = buildImportMap(projects, workspaceRoot);

      // Each project has its own replace directive scope
      expect(result.projectReplaceDirectives.has('apps/api')).toBe(true);
      expect(result.projectReplaceDirectives.has('apps/web')).toBe(true);

      // apps/api points to apps/common (which has module github.com/myorg/apps-common)
      const apiReplaces = result.projectReplaceDirectives.get('apps/api');
      expect(apiReplaces!.get('github.com/myorg/common')).toBe(
        'github.com/myorg/apps-common'
      );

      // apps/web points to libs/common (which has module github.com/myorg/libs-common)
      const webReplaces = result.projectReplaceDirectives.get('apps/web');
      expect(webReplaces!.get('github.com/myorg/common')).toBe(
        'github.com/myorg/libs-common'
      );
    });
  });
});
