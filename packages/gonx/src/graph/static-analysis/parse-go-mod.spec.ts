import stripIndent from 'strip-indent';
import { readFile } from 'fs/promises';
import { parseGoMod } from './parse-go-mod';

jest.mock('fs/promises');
jest.mock('@nx/devkit', () => ({ logger: { warn: jest.fn() } }));

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('parseGoMod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('module declaration parsing', () => {
    it('should parse basic module declaration', async () => {
      mockReadFile.mockResolvedValue(
        'module github.com/myorg/myapp\n\ngo 1.21'
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
      expect(result!.replaceDirectives.size).toBe(0);
    });

    it('should parse quoted module path with double quotes', async () => {
      mockReadFile.mockResolvedValue(
        'module "github.com/myorg/myapp"\n\ngo 1.21'
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
    });

    it('should parse quoted module path with single quotes', async () => {
      mockReadFile.mockResolvedValue(
        "module 'github.com/myorg/myapp'\n\ngo 1.21"
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
    });

    it('should parse quoted module path with backticks', async () => {
      mockReadFile.mockResolvedValue(
        'module `github.com/myorg/myapp`\n\ngo 1.21'
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
    });

    it('should return null for missing module declaration', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          go 1.21

          require (
            github.com/foo/bar v1.0.0
          )
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).toBeNull();
    });

    it('should return null for non-existent file', async () => {
      mockReadFile.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      const result = await parseGoMod('/nonexistent/go.mod');

      expect(result).toBeNull();
    });

    it('should return null for empty module path in quotes', async () => {
      mockReadFile.mockResolvedValue('module ""\n\ngo 1.21');

      const result = await parseGoMod('/project/go.mod');

      expect(result).toBeNull();
    });
  });

  describe('single-line replace directives', () => {
    it('should parse simple replace directive', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          go 1.21

          replace github.com/old/pkg => github.com/new/pkg
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.size).toBe(1);
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace directive with version on old path', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          replace github.com/old/pkg v1.0.0 => github.com/new/pkg
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace directive with versions on both paths', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          replace github.com/old/pkg v1.0.0 => github.com/new/pkg v2.0.0
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace directive with local path', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          replace github.com/myorg/common => ../common
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/myorg/common')).toBe(
        '../common'
      );
    });

    it('should parse multiple single-line replace directives', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          replace github.com/pkg1 => ../pkg1
          replace github.com/pkg2 => ../pkg2
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.size).toBe(2);
      expect(result!.replaceDirectives.get('github.com/pkg1')).toBe('../pkg1');
      expect(result!.replaceDirectives.get('github.com/pkg2')).toBe('../pkg2');
    });
  });

  describe('block replace directives', () => {
    it('should parse replace block with single directive', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          replace (
            github.com/old/pkg => github.com/new/pkg
          )
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.size).toBe(1);
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        'github.com/new/pkg'
      );
    });

    it('should parse replace block with multiple directives', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          replace (
            github.com/pkg1 => ../pkg1
            github.com/pkg2 v1.0.0 => ../pkg2
            github.com/pkg3 => github.com/other/pkg3 v2.0.0
          )
        `)
      );

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
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp // my app module

          replace github.com/old/pkg => ../pkg // local replacement
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        '../pkg'
      );
    });

    it('should ignore multi-line comments', async () => {
      mockReadFile.mockResolvedValue(
        stripIndent(`
          module github.com/myorg/myapp

          /* This is a
             multi-line comment */

          replace github.com/old/pkg => ../pkg
        `)
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/old/pkg')).toBe(
        '../pkg'
      );
    });
  });

  describe('line endings', () => {
    // go.mod files authored on Windows commonly use CRLF. The parser splits
    // on '\n' and then matches block-start/end against the trimmed line, so
    // a stray '\r' on `replace (` or `)` lines would silently drop every
    // replace directive in the block — the worst-kind-of-silent failure mode.
    it('should parse module declaration with CRLF line endings', async () => {
      mockReadFile.mockResolvedValue(
        'module github.com/myorg/myapp\r\n\r\ngo 1.21\r\n'
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.modulePath).toBe('github.com/myorg/myapp');
    });

    it('should parse a replace block with CRLF line endings', async () => {
      mockReadFile.mockResolvedValue(
        'module github.com/myorg/myapp\r\n' +
          '\r\n' +
          'replace (\r\n' +
          '\tgithub.com/old/a => ../a\r\n' +
          '\tgithub.com/old/b => ../b\r\n' +
          ')\r\n'
      );

      const result = await parseGoMod('/project/go.mod');

      expect(result).not.toBeNull();
      expect(result!.replaceDirectives.get('github.com/old/a')).toBe('../a');
      expect(result!.replaceDirectives.get('github.com/old/b')).toBe('../b');
    });
  });
});
