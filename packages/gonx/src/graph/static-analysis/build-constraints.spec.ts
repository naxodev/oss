import {
  BuildContext,
  getDefaultBuildContext,
  shouldIncludeFile,
} from './build-constraints';

const LINUX_AMD64: BuildContext = { goos: 'linux', goarch: 'amd64' };
const DARWIN_ARM64: BuildContext = { goos: 'darwin', goarch: 'arm64' };
const WINDOWS_AMD64: BuildContext = { goos: 'windows', goarch: 'amd64' };

/** Wrap a constraint comment in a minimal Go file. */
function withConstraint(comment: string): string {
  return `${comment}\n\npackage foo\n\nimport "fmt"\n`;
}

describe('shouldIncludeFile', () => {
  it('includes a file without any constraint', () => {
    const content = 'package foo\n\nimport "fmt"\n';
    expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(true);
  });

  describe('//go:build', () => {
    it('matches a single GOOS tag (acceptance: linux on linux)', () => {
      const content = withConstraint('//go:build linux');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(false);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('handles negation (acceptance: !windows)', () => {
      const content = withConstraint('//go:build !windows');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('handles AND', () => {
      const content = withConstraint('//go:build linux && amd64');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(
        shouldIncludeFile(content, { goos: 'linux', goarch: 'arm64' })
      ).toBe(false);
      expect(
        shouldIncludeFile(content, { goos: 'darwin', goarch: 'amd64' })
      ).toBe(false);
    });

    it('handles OR', () => {
      const content = withConstraint('//go:build linux || darwin');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('respects parentheses for precedence', () => {
      // `(linux || darwin) && amd64`: amd64 required on either unix host.
      const content = withConstraint('//go:build (linux || darwin) && amd64');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(false);
      expect(
        shouldIncludeFile(content, { goos: 'darwin', goarch: 'amd64' })
      ).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('matches the `unix` pseudo-tag for unix-like OSes', () => {
      const content = withConstraint('//go:build unix');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('treats `go1.X` tags as always satisfied', () => {
      const content = withConstraint('//go:build go1.22');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(true);
    });

    it('treats unknown identifiers as user tags (false by default)', () => {
      const content = withConstraint('//go:build integration');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(false);
      expect(
        shouldIncludeFile(content, {
          ...LINUX_AMD64,
          tags: new Set(['integration']),
        })
      ).toBe(true);
    });

    it('takes the first //go:build line when multiple are present', () => {
      // Per the Go spec, the first build constraint in the file wins.
      const content =
        '//go:build linux\n//go:build windows\n\npackage foo\n\nimport "fmt"\n';
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });
  });

  describe('// +build (legacy)', () => {
    it('matches a single tag', () => {
      const content = withConstraint('// +build linux');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('treats space-separated terms as OR', () => {
      const content = withConstraint('// +build linux darwin');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('treats comma-separated terms within an option as AND', () => {
      // `linux,amd64 darwin,arm64` → (linux AND amd64) OR (darwin AND arm64)
      const content = withConstraint('// +build linux,amd64 darwin,arm64');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(true);
      expect(
        shouldIncludeFile(content, { goos: 'linux', goarch: 'arm64' })
      ).toBe(false);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('handles `!` negation per term', () => {
      // `darwin,!cgo` → darwin AND NOT cgo. cgo is always false in our model,
      // so this matches on darwin.
      const content = withConstraint('// +build darwin,!cgo');
      expect(shouldIncludeFile(content, DARWIN_ARM64)).toBe(true);
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(false);
    });

    it('ANDs multiple // +build lines together', () => {
      const content =
        '// +build linux\n// +build amd64\n\npackage foo\n\nimport "fmt"\n';
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(
        shouldIncludeFile(content, { goos: 'linux', goarch: 'arm64' })
      ).toBe(false);
      expect(
        shouldIncludeFile(content, { goos: 'darwin', goarch: 'amd64' })
      ).toBe(false);
    });
  });

  describe('precedence between forms', () => {
    it('uses //go:build when both forms are present', () => {
      // Modern says linux (true on linux); legacy contradicts (windows-only).
      // Modern wins.
      const content =
        '//go:build linux\n// +build windows\n\npackage foo\n\nimport "fmt"\n';
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });
  });

  describe('robustness', () => {
    it('falls back to include on a malformed expression', () => {
      // Unbalanced paren: better to over-include than crash graph build.
      const content = withConstraint('//go:build (linux');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
    });

    it('handles CRLF line endings', () => {
      const content =
        '//go:build linux\r\n\r\npackage foo\r\n\r\nimport "fmt"\r\n';
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('ignores constraint-shaped text after the package clause', () => {
      // A `//go:build` line appearing AFTER `package` is not a build
      // constraint per the spec; it must be in the header.
      const content = 'package foo\n\n//go:build windows\n\nimport "fmt"\n';
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
    });
  });
});

describe('getDefaultBuildContext', () => {
  it('returns the current platform as a Go-shaped context', () => {
    const ctx = getDefaultBuildContext();
    expect(typeof ctx.goos).toBe('string');
    expect(typeof ctx.goarch).toBe('string');
    expect(ctx.goos.length).toBeGreaterThan(0);
    expect(ctx.goarch.length).toBeGreaterThan(0);
  });
});
