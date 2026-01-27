import { resolveImport } from './resolve-import';

describe('resolveImport', () => {
  describe('exact match resolution', () => {
    it('should resolve exact module match', () => {
      const baseImportMap = new Map([
        ['github.com/myorg/shared', 'libs/shared'],
      ]);
      const projectReplaces = new Map<string, Map<string, string | null>>();

      const result = resolveImport(
        'github.com/myorg/shared',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBe('libs/shared');
    });
  });

  describe('longest-prefix matching', () => {
    it('should match subpackage to module', () => {
      const baseImportMap = new Map([
        ['github.com/myorg/shared', 'libs/shared'],
      ]);
      const projectReplaces = new Map<string, Map<string, string | null>>();

      const result = resolveImport(
        'github.com/myorg/shared/utils',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBe('libs/shared');
    });

    it('should use longest matching prefix', () => {
      const baseImportMap = new Map([
        ['github.com/myorg', 'libs/myorg'],
        ['github.com/myorg/shared', 'libs/shared'],
        ['github.com/myorg/shared/internal', 'libs/shared-internal'],
      ]);
      const projectReplaces = new Map<string, Map<string, string | null>>();

      // Should match 'github.com/myorg/shared/internal' not 'github.com/myorg/shared'
      const result = resolveImport(
        'github.com/myorg/shared/internal/utils',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBe('libs/shared-internal');
    });

    it('should return null for no matching prefix', () => {
      const baseImportMap = new Map([
        ['github.com/myorg/shared', 'libs/shared'],
      ]);
      const projectReplaces = new Map<string, Map<string, string | null>>();

      const result = resolveImport(
        'github.com/external/library',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBeNull();
    });
  });

  describe('self-reference prevention', () => {
    it('should return null for self-referential import', () => {
      const baseImportMap = new Map([
        ['github.com/myorg/api', 'apps/api'],
        ['github.com/myorg/shared', 'libs/shared'],
      ]);
      const projectReplaces = new Map<string, Map<string, string | null>>();

      const result = resolveImport(
        'github.com/myorg/api/internal',
        baseImportMap,
        'apps/api', // source project is same as target
        projectReplaces
      );

      expect(result).toBeNull();
    });
  });

  describe('replace directive handling', () => {
    it('should use replace directive over base map', () => {
      const baseImportMap = new Map([
        ['github.com/old/pkg', 'libs/old-pkg'],
        ['github.com/new/pkg', 'libs/new-pkg'],
      ]);
      const projectReplaces = new Map([
        ['apps/api', new Map([['github.com/old/pkg', 'github.com/new/pkg']])],
      ]);

      const result = resolveImport(
        'github.com/old/pkg',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBe('libs/new-pkg');
    });

    it('should apply replace directive prefix to subpackages', () => {
      const baseImportMap = new Map([['github.com/new/pkg', 'libs/new-pkg']]);
      const projectReplaces = new Map([
        ['apps/api', new Map([['github.com/old/pkg', 'github.com/new/pkg']])],
      ]);

      const result = resolveImport(
        'github.com/old/pkg/utils',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBe('libs/new-pkg');
    });

    it('should not apply replace directive from other projects', () => {
      const baseImportMap = new Map([
        ['github.com/old/pkg', 'libs/old-pkg'],
        ['github.com/new/pkg', 'libs/new-pkg'],
      ]);
      const projectReplaces = new Map([
        // apps/web has the replace, not apps/api
        ['apps/web', new Map([['github.com/old/pkg', 'github.com/new/pkg']])],
      ]);

      const result = resolveImport(
        'github.com/old/pkg',
        baseImportMap,
        'apps/api', // this project doesn't have the replace
        projectReplaces
      );

      expect(result).toBe('libs/old-pkg');
    });
  });

  describe('null-suppression behavior', () => {
    it('should return null when replace directive is null', () => {
      const baseImportMap = new Map([
        ['github.com/vendor/pkg', 'libs/vendor-pkg'],
      ]);
      const projectReplaces = new Map([
        [
          'apps/api',
          new Map<string, string | null>([['github.com/vendor/pkg', null]]),
        ],
      ]);

      const result = resolveImport(
        'github.com/vendor/pkg',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBeNull();
    });

    it('should suppress subpackages of null replace directive', () => {
      const baseImportMap = new Map([
        ['github.com/vendor/pkg', 'libs/vendor-pkg'],
      ]);
      const projectReplaces = new Map([
        [
          'apps/api',
          new Map<string, string | null>([['github.com/vendor/pkg', null]]),
        ],
      ]);

      const result = resolveImport(
        'github.com/vendor/pkg/utils',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBeNull();
    });
  });

  describe('standard library', () => {
    it('should return null for standard library imports', () => {
      const baseImportMap = new Map([
        ['github.com/myorg/shared', 'libs/shared'],
      ]);
      const projectReplaces = new Map<string, Map<string, string | null>>();

      const result = resolveImport(
        'fmt',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBeNull();
    });

    it('should return null for nested standard library imports', () => {
      const baseImportMap = new Map([
        ['github.com/myorg/shared', 'libs/shared'],
      ]);
      const projectReplaces = new Map<string, Map<string, string | null>>();

      const result = resolveImport(
        'path/filepath',
        baseImportMap,
        'apps/api',
        projectReplaces
      );

      expect(result).toBeNull();
    });
  });
});
