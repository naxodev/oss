jest.mock('@nx/devkit', () => ({ logger: { warn: jest.fn() } }));
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  platform: jest.fn(() => 'linux'),
  arch: jest.fn(() => 'x64'),
}));

import { logger } from '@nx/devkit';
import { platform, arch } from 'os';
import {
  BuildContext,
  getDefaultBuildContext,
  shouldIncludeFile,
  shouldIncludeFilename,
} from './build-constraints';

const mockedWarn = logger.warn as jest.MockedFunction<typeof logger.warn>;
const mockedPlatform = platform as jest.MockedFunction<typeof platform>;
const mockedArch = arch as jest.MockedFunction<typeof arch>;

const EMPTY_TAGS: ReadonlySet<string> = new Set();
const LINUX_AMD64: BuildContext = {
  goos: 'linux',
  goarch: 'amd64',
  tags: EMPTY_TAGS,
};
const DARWIN_ARM64: BuildContext = {
  goos: 'darwin',
  goarch: 'arm64',
  tags: EMPTY_TAGS,
};
const WINDOWS_AMD64: BuildContext = {
  goos: 'windows',
  goarch: 'amd64',
  tags: EMPTY_TAGS,
};
const LINUX_ARM64: BuildContext = {
  goos: 'linux',
  goarch: 'arm64',
  tags: EMPTY_TAGS,
};
const DARWIN_AMD64: BuildContext = {
  goos: 'darwin',
  goarch: 'amd64',
  tags: EMPTY_TAGS,
};

/** Wrap a constraint comment in a minimal Go file. */
function withConstraint(comment: string): string {
  return `${comment}\n\npackage foo\n\nimport "fmt"\n`;
}

beforeEach(() => {
  mockedWarn.mockClear();
  mockedPlatform.mockReturnValue('linux');
  mockedArch.mockReturnValue('x64');
});

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
        shouldIncludeFile(content, {
          goos: 'linux',
          goarch: 'arm64',
          tags: EMPTY_TAGS,
        })
      ).toBe(false);
      expect(
        shouldIncludeFile(content, {
          goos: 'darwin',
          goarch: 'amd64',
          tags: EMPTY_TAGS,
        })
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
        shouldIncludeFile(content, {
          goos: 'darwin',
          goarch: 'amd64',
          tags: EMPTY_TAGS,
        })
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
      // The Go spec actually rejects files with more than one //go:build
      // line — `gofmt` and `go vet` flag duplicates as an error. We
      // tolerate duplicates and pick the first as a leniency choice;
      // this test pins that policy.
      const content = withConstraint('//go:build linux\n//go:build windows');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('respects operator precedence with && binding tighter than ||', () => {
      // `linux && arm64 || darwin && amd64` must parse as
      // `(linux && arm64) || (darwin && amd64)`. If a future change
      // swapped to OR-binds-tighter, LINUX_ARM64 and DARWIN_AMD64 below
      // would both flip from true to false.
      const content = withConstraint(
        '//go:build linux && arm64 || darwin && amd64'
      );
      expect(shouldIncludeFile(content, LINUX_ARM64)).toBe(true);
      expect(shouldIncludeFile(content, DARWIN_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(false);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(false);
    });

    it('treats a lone `!` operand as include, not exclude', () => {
      // `!` with no operand previously evaluated as `!true → false`,
      // silently *excluding* the file. The over-include policy demands
      // include on every malformed shape.
      const content = withConstraint('//go:build !');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(true);
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
        shouldIncludeFile(content, {
          goos: 'linux',
          goarch: 'arm64',
          tags: EMPTY_TAGS,
        })
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
      const content = withConstraint('// +build linux\n// +build amd64');
      expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
      expect(
        shouldIncludeFile(content, {
          goos: 'linux',
          goarch: 'arm64',
          tags: EMPTY_TAGS,
        })
      ).toBe(false);
      expect(
        shouldIncludeFile(content, {
          goos: 'darwin',
          goarch: 'amd64',
          tags: EMPTY_TAGS,
        })
      ).toBe(false);
    });
  });

  describe('precedence between forms', () => {
    it('uses //go:build when both forms are present', () => {
      // Modern says linux (true on linux); legacy contradicts (windows-only).
      // Modern wins.
      const content = withConstraint('//go:build linux\n// +build windows');
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

describe('directive recognition', () => {
  it('ignores `//go:buildfoo` (no whitespace after the directive token)', () => {
    // Loose `startsWith` would accept this as a `//go:build` directive
    // and evaluate "foo darwin" → the file would silently include or
    // exclude on a typo. Tightened matching rejects it as a comment.
    const content = '//go:buildfoo darwin\n\npackage foo\n\nimport "fmt"\n';
    expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(true);
  });

  it('ignores `// +builder` (no whitespace after the directive token)', () => {
    const content = '// +builder x\n\npackage foo\n\nimport "fmt"\n';
    expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(true);
  });

  it('does not treat constraint-shaped text in a block comment as a directive', () => {
    // The Go spec recognizes constraints only in `//`-style line comments,
    // never inside `/* ... */` blocks. The scanner honors this because
    // the trimmed line starts with `/*`, not `//go:build`. This test pins
    // the invariant against future scanner refactors.
    const content = '/* //go:build windows */\n\npackage foo\n\nimport "fmt"\n';
    expect(shouldIncludeFile(content, LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(true);
  });
});

describe('malformed-expression warnings', () => {
  it('warns when trailing tokens force an over-include', () => {
    // Typo: spaces instead of `&&`. Without the warning the user has no
    // way to tell their intended constraint was thrown away and the
    // file silently includes on every platform.
    const content = withConstraint('//go:build linux foo bar');
    expect(shouldIncludeFile(content, WINDOWS_AMD64, 'path/to/a.go')).toBe(
      true
    );
    expect(mockedWarn).toHaveBeenCalledTimes(1);
    expect(mockedWarn).toHaveBeenCalledWith(
      expect.stringContaining('trailing tokens')
    );
    expect(mockedWarn.mock.calls[0][0]).toContain('path/to/a.go');
  });

  it('warns on an empty //go:build constraint', () => {
    const content = withConstraint('//go:build');
    expect(shouldIncludeFile(content, LINUX_AMD64, 'a.go')).toBe(true);
    expect(mockedWarn).toHaveBeenCalledWith(
      expect.stringContaining('Empty //go:build')
    );
  });

  it('warns when the tokenizer skips unrecognized characters', () => {
    // A bare hyphen isn't in the alphanumeric tag set; the tokenizer
    // silently dropped it before this fix.
    const content = withConstraint('//go:build my-tag');
    expect(shouldIncludeFile(content, LINUX_AMD64, 'a.go')).toBe(true);
    expect(mockedWarn).toHaveBeenCalledWith(
      expect.stringContaining('unrecognized characters')
    );
  });

  it('stays silent when no sourceLabel is provided', () => {
    // Unit tests that exercise the malformed paths don't want the noise.
    const content = withConstraint('//go:build linux foo bar');
    expect(shouldIncludeFile(content, WINDOWS_AMD64)).toBe(true);
    expect(mockedWarn).not.toHaveBeenCalled();
  });
});

describe('shouldIncludeFilename', () => {
  it('includes a file with no recognized suffix', () => {
    expect(shouldIncludeFilename('foo.go', LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFilename('foo.go', WINDOWS_AMD64)).toBe(true);
    expect(shouldIncludeFilename('nethelper.go', LINUX_AMD64)).toBe(true);
  });

  it('returns true for non-Go filenames (caller passed wrong file)', () => {
    expect(shouldIncludeFilename('foo.txt', LINUX_AMD64)).toBe(true);
  });

  it('gates on GOOS for `name_<GOOS>.go`', () => {
    expect(shouldIncludeFilename('signal_linux.go', LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFilename('signal_linux.go', DARWIN_ARM64)).toBe(false);
    expect(shouldIncludeFilename('signal_linux.go', WINDOWS_AMD64)).toBe(false);
  });

  it('gates on GOARCH for `name_<GOARCH>.go`', () => {
    expect(shouldIncludeFilename('sha1block_amd64.go', LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFilename('sha1block_amd64.go', DARWIN_ARM64)).toBe(
      false
    );
  });

  it('gates on both for `name_<GOOS>_<GOARCH>.go`', () => {
    expect(
      shouldIncludeFilename('zsyscall_darwin_arm64.go', DARWIN_ARM64)
    ).toBe(true);
    expect(
      shouldIncludeFilename('zsyscall_darwin_arm64.go', DARWIN_AMD64)
    ).toBe(false);
    expect(shouldIncludeFilename('zsyscall_darwin_arm64.go', LINUX_ARM64)).toBe(
      false
    );
  });

  it('handles `_test.go` suffix combined with GOOS', () => {
    expect(shouldIncludeFilename('foo_linux_test.go', LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFilename('foo_linux_test.go', WINDOWS_AMD64)).toBe(
      false
    );
  });

  it('handles `_test.go` suffix combined with GOOS+GOARCH', () => {
    expect(
      shouldIncludeFilename('foo_darwin_arm64_test.go', DARWIN_ARM64)
    ).toBe(true);
    expect(shouldIncludeFilename('foo_darwin_arm64_test.go', LINUX_AMD64)).toBe(
      false
    );
  });

  it('treats reverse-ordered <GOARCH>_<GOOS> as a single-token GOOS gate', () => {
    // Per the Go spec the pair check requires order GOOS-then-GOARCH.
    // `foo_amd64_linux.go` falls through to the single-token check on
    // the trailing `linux` (a known GOOS) → gates on linux only, ignores
    // the `amd64` entirely.
    expect(shouldIncludeFilename('foo_amd64_linux.go', LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFilename('foo_amd64_linux.go', LINUX_ARM64)).toBe(true);
    expect(shouldIncludeFilename('foo_amd64_linux.go', DARWIN_AMD64)).toBe(
      false
    );
  });

  it('does not treat `unix` as a filename suffix', () => {
    // `unix` is a build-tag pseudo-name, NOT a known GOOS. A file named
    // `foo_unix.go` is unconstrained by filename (the constraint would
    // need to be a `//go:build unix` directive in the source).
    expect(shouldIncludeFilename('foo_unix.go', LINUX_AMD64)).toBe(true);
    expect(shouldIncludeFilename('foo_unix.go', WINDOWS_AMD64)).toBe(true);
  });

  it('strips directory components from the path', () => {
    expect(shouldIncludeFilename('/abs/pkg/signal_linux.go', LINUX_AMD64)).toBe(
      true
    );
    expect(
      shouldIncludeFilename('/abs/pkg/signal_linux.go', WINDOWS_AMD64)
    ).toBe(false);
    // Windows-style backslash separator
    expect(
      shouldIncludeFilename('C:\\\\pkg\\\\signal_linux.go', WINDOWS_AMD64)
    ).toBe(false);
  });

  it('ignores tokens before the trailing platform suffix', () => {
    // `helper` isn't a platform name; only `linux` is checked.
    expect(shouldIncludeFilename('foo_helper_linux.go', LINUX_AMD64)).toBe(
      true
    );
    expect(shouldIncludeFilename('foo_helper_linux.go', DARWIN_ARM64)).toBe(
      false
    );
  });
});

describe('getDefaultBuildContext', () => {
  it('maps win32 to windows and x64 to amd64', () => {
    mockedPlatform.mockReturnValue('win32');
    mockedArch.mockReturnValue('x64');
    const ctx = getDefaultBuildContext();
    expect(ctx.goos).toBe('windows');
    expect(ctx.goarch).toBe('amd64');
  });

  it('maps sunos to solaris', () => {
    mockedPlatform.mockReturnValue('sunos');
    mockedArch.mockReturnValue('x64');
    expect(getDefaultBuildContext().goos).toBe('solaris');
  });

  it('maps darwin/arm64 to themselves', () => {
    mockedPlatform.mockReturnValue('darwin');
    mockedArch.mockReturnValue('arm64');
    const ctx = getDefaultBuildContext();
    expect(ctx.goos).toBe('darwin');
    expect(ctx.goarch).toBe('arm64');
  });

  it('initializes an empty tags set by default', () => {
    expect(getDefaultBuildContext().tags.size).toBe(0);
  });

  it('passes unknown Node platforms through unchanged', () => {
    // Best-effort fallback: a niche Node platform (e.g. cygwin) is
    // returned as-is. Documented behavior.
    mockedPlatform.mockReturnValue('cygwin' as NodeJS.Platform);
    mockedArch.mockReturnValue('x64');
    expect(getDefaultBuildContext().goos).toBe('cygwin');
  });
});
