import { fs, vol } from 'memfs';
import { parseGoMod } from './parse-go-mod';

jest.mock('fs/promises', () => fs.promises);

describe('parseGoMod', () => {
  beforeEach(() => {
    vol.reset();
  });

  describe('module declaration parsing', () => {
    it('should parse basic module declaration', async () => {
      vol.fromJSON({
        '/project/go.mod': 'module github.com/myorg/myapp\n\ngo 1.21',
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
      expect(result!.replaceDirectives.size).toBe(0);
    });

    it('should parse quoted module path with double quotes', async () => {
      vol.fromJSON({
        '/project/go.mod': 'module "github.com/myorg/myapp"\n\ngo 1.21',
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
    });

    it('should parse quoted module path with single quotes', async () => {
      vol.fromJSON({
        '/project/go.mod': "module 'github.com/myorg/myapp'\n\ngo 1.21",
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
    });

    it('should parse quoted module path with backticks', async () => {
      vol.fromJSON({
        '/project/go.mod': 'module `github.com/myorg/myapp`\n\ngo 1.21',
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
    });

    it('should return null for missing module declaration', async () => {
      vol.fromJSON({
        '/project/go.mod':
          'go 1.21\n\nrequire (\n  github.com/foo/bar v1.0.0\n)',
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).toBeNull();
    });

    it('should return null for non-existent file', async () => {
      const result = await parseGoMod('/nonexistent/go.mod');

      expect(result).toBeNull();
    });

    it('should return null for empty module path in quotes', async () => {
      vol.fromJSON({
        '/project/go.mod': 'module ""\n\ngo 1.21',
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).toBeNull();
    });
  });

  describe('single-line replace directives', () => {
    it('should parse simple replace directive', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

go 1.21

replace github.com/old/pkg => github.com/new/pkg
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.size).toBe(1);
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace directive with version on old path', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

replace github.com/old/pkg v1.0.0 => github.com/new/pkg
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace directive with versions on both paths', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

replace github.com/old/pkg v1.0.0 => github.com/new/pkg v2.0.0
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace directive with local path', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

replace github.com/myorg/common => ../common
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/myorg/common')).toBe(
        '../common'
      );
    });

    it('should parse multiple single-line replace directives', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

replace github.com/pkg1 => ../pkg1
replace github.com/pkg2 => ../pkg2
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.size).toBe(2);
      expect(result!.replaceDirectives.get('github.com/pkg1')).toBe('../pkg1');
      expect(result!.replaceDirectives.get('github.com/pkg2')).toBe('../pkg2');
    });
  });

  describe('block replace directives', () => {
    it('should parse replace block with single directive', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

replace (
  github.com/old/pkg => github.com/new/pkg
)
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.size).toBe(1);
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace block with multiple directives', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

replace (
  github.com/pkg1 => ../pkg1
  github.com/pkg2 v1.0.0 => ../pkg2
  github.com/pkg3 => github.com/other/pkg3 v2.0.0
)
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.size).toBe(3);
      expect(result!.replaceDirectives.get('github.com/pkg1')).toBe('../pkg1');
      expect(result!.replaceDirectives.get('github.com/pkg2')).toBe('../pkg2');
      expect(result!.replaceDirectives.get('github.com/pkg3')).toBe(
        'github.com/other/pkg3'
      );
    });
  });

  describe('comment handling', () => {
    it('should ignore inline comments', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp // my app module

replace github.com/old/pkg => ../pkg // local replacement
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        '../pkg'
      );
    });

    it('should ignore multi-line comments', async () => {
      vol.fromJSON({
        '/project/go.mod': `
module github.com/myorg/myapp

/* This is a
   multi-line comment */

replace github.com/old/pkg => ../pkg
`,
      });

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        '../pkg'
      );
    });
  });
});
