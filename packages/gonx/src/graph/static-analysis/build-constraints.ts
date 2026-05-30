/**
 * Go build-constraint evaluation for static dependency analysis.
 *
 * Supports both forms:
 *  - Modern `//go:build` (boolean expression with `&&`, `||`, `!`, parens)
 *  - Legacy `// +build` (OR-of-AND term lists; multiple lines AND'd)
 *
 * When both are present (`gofmt` emits both for files that must compile
 * under pre-1.17 Go), `//go:build` wins per the spec.
 *
 * Honored alongside the in-source forms: Go's filename-suffix conventions
 * (`name_<GOOS>.go`, `name_<GOARCH>.go`, `name_<GOOS>_<GOARCH>.go`, with an
 * optional trailing `_test`). See `shouldIncludeFilename`.
 *
 * Known limitations:
 *  - `go1.X` version tags are treated as always-true: we have no compiler
 *    handy to consult, and over-including is safer than under-including
 *    for graph computation. Tracked in #108 (lift policy onto context).
 *  - The pseudo-tag `cgo` is treated as false (static analysis never runs
 *    cgo). Same tracking issue (#108).
 */

import { logger } from '@nx/devkit';
import { platform, arch } from 'os';

// === Go GOOS values ============================================================
//
// One tuple is the source of truth. The internal `KnownGoOS` literal union and
// the runtime `KNOWN_GOOSES` set are both derived from it, so adding a platform
// is a single-line change. The exported `GoOS` adds a `(string & {})` escape
// hatch so unknown Node platforms still pass through `nodePlatformToGoos`
// without losing autocomplete on the canonical set.

/** Canonical Go `GOOS` values per `internal/syslist.KnownOS`. */
const KNOWN_GOOSES_LIST = [
  'aix',
  'android',
  'darwin',
  'dragonfly',
  'freebsd',
  'hurd',
  'illumos',
  'ios',
  'js',
  'linux',
  'nacl',
  'netbsd',
  'openbsd',
  'plan9',
  'solaris',
  'wasip1',
  'windows',
  'zos',
] as const;

/** Closed union of Go GOOS values; used internally to enforce membership. */
type KnownGoOS = (typeof KNOWN_GOOSES_LIST)[number];

/** Exported GOOS type with an escape hatch for unknown Node platforms. */
// eslint-disable-next-line @typescript-eslint/ban-types
export type GoOS = KnownGoOS | (string & {});

// Construction-time generic enforces every element is a `KnownGoOS`; the
// public type widens to `string` so callers can probe with arbitrary input
// (TypeScript 5.x narrowed `Set<T>.has` to require `T`).
const KNOWN_GOOSES: ReadonlySet<string> = new Set<KnownGoOS>(KNOWN_GOOSES_LIST);

/**
 * Unix-like GOOS subset per Go's `internal/syslist.UnixOS` (since Go 1.19).
 * Construction-time `Set<KnownGoOS>` blocks a typo here (e.g. `'darvin'`).
 */
const UNIX_OSES: ReadonlySet<string> = new Set<KnownGoOS>([
  'aix',
  'android',
  'darwin',
  'dragonfly',
  'freebsd',
  'hurd',
  'illumos',
  'ios',
  'linux',
  'netbsd',
  'openbsd',
  'solaris',
]);

// === Go GOARCH values ==========================================================

/** Canonical Go `GOARCH` values per `internal/syslist.KnownArch`. */
const KNOWN_GOARCHES_LIST = [
  '386',
  'amd64',
  'amd64p32',
  'arm',
  'arm64',
  'arm64be',
  'armbe',
  'loong64',
  'mips',
  'mips64',
  'mips64le',
  'mips64p32',
  'mips64p32le',
  'mipsle',
  'ppc',
  'ppc64',
  'ppc64le',
  'riscv',
  'riscv64',
  's390',
  's390x',
  'sparc',
  'sparc64',
  'wasm',
] as const;

type KnownGoArch = (typeof KNOWN_GOARCHES_LIST)[number];

// eslint-disable-next-line @typescript-eslint/ban-types
export type GoArch = KnownGoArch | (string & {});

const KNOWN_GOARCHES: ReadonlySet<string> = new Set<KnownGoArch>(
  KNOWN_GOARCHES_LIST
);

export interface BuildContext {
  readonly goos: GoOS;
  readonly goarch: GoArch;
  /** User-supplied tags (e.g. `integration`, `debug`). Default empty. */
  readonly tags: ReadonlySet<string>;
}

/**
 * Mapping from Node's `process.platform` to Go's GOOS. Keys are constrained
 * to `NodeJS.Platform` and values to `KnownGoOS`, so a typo on either side is
 * a compile error. Entries are listed only for platforms Go's `internal/syslist`
 * actually recognizes — others (e.g. Node's `haiku`, `cygwin`) fall through to
 * the original value in `nodePlatformToGoos`.
 */
const NODE_PLATFORM_TO_GOOS: Readonly<
  Partial<Record<NodeJS.Platform, KnownGoOS>>
> = {
  aix: 'aix',
  android: 'android',
  darwin: 'darwin',
  freebsd: 'freebsd',
  linux: 'linux',
  netbsd: 'netbsd',
  openbsd: 'openbsd',
  sunos: 'solaris',
  win32: 'windows',
};

/**
 * Mapping from Node's `process.arch` to Go's GOARCH. Values are constrained to
 * `KnownGoArch`. The only non-identity rename is `mipsel → mipsle` (Node spells
 * it the former, Go the latter).
 */
const NODE_ARCH_TO_GOARCH: Readonly<Record<string, KnownGoArch>> = {
  arm: 'arm',
  arm64: 'arm64',
  ia32: '386',
  loong64: 'loong64',
  mips: 'mips',
  mipsel: 'mipsle',
  ppc64: 'ppc64',
  riscv64: 'riscv64',
  s390x: 's390x',
  x64: 'amd64',
};

function nodePlatformToGoos(p: NodeJS.Platform): GoOS {
  // Best-effort: unknown Node platforms (e.g. cygwin, haiku) pass through.
  return NODE_PLATFORM_TO_GOOS[p] ?? p;
}

function nodeArchToGoarch(a: string): GoArch {
  return NODE_ARCH_TO_GOARCH[a] ?? a;
}

/**
 * Derive a default `BuildContext` from the current Node process.
 * The result is process-stable — safe to memoize at module level.
 */
export function getDefaultBuildContext(): BuildContext {
  return {
    goos: nodePlatformToGoos(platform()),
    goarch: nodeArchToGoarch(arch()),
    tags: new Set(),
  };
}

/**
 * Decide whether a Go source file should be considered for import
 * extraction given its content and a build context. Returns `true` when
 * no recognized build constraint is present.
 *
 * @param sourceLabel - Optional identifier (typically a file path) used
 *   in warning messages when the evaluator hits a malformed-expression
 *   fallback. Omit it to silence those warnings (the unit tests do).
 */
export function shouldIncludeFile(
  content: string,
  ctx: BuildContext,
  sourceLabel?: string
): boolean {
  const { goBuild, plusBuild } = readHeaderConstraints(content);
  if (goBuild !== null) {
    return evaluateGoBuild(goBuild, ctx, sourceLabel);
  }
  if (plusBuild.length > 0) {
    // Multiple `// +build` lines are AND'd per the legacy spec.
    return plusBuild.every((line) => evaluateLegacyLine(line, ctx));
  }
  return true;
}

/**
 * Decide whether a Go source file should be considered for import
 * extraction based on its filename, honoring Go's implicit platform
 * suffix rules. Returns `true` when the filename carries no recognized
 * suffix or when the suffix matches `ctx`.
 *
 * Recognized patterns (Go's `go/build` algorithm, simplified):
 *  - `name_<GOOS>.go`         — gates on GOOS
 *  - `name_<GOARCH>.go`       — gates on GOARCH
 *  - `name_<GOOS>_<GOARCH>.go` — gates on both
 *  - any of the above with `_test` appended before `.go`
 *
 * "Known" GOOS/GOARCH means the value appears in Go's `internal/syslist`.
 * A name like `nethelper.go` whose tokens don't match either set is
 * treated as unconstrained.
 *
 * @param filePath - Full path or basename — directory parts are stripped.
 */
export function shouldIncludeFilename(
  filePath: string,
  ctx: BuildContext
): boolean {
  const basename = filePath.split(/[/\\]/).pop() ?? filePath;
  if (!basename.endsWith('.go')) return true;

  let stem = basename.slice(0, -'.go'.length);
  if (stem.endsWith('_test')) {
    stem = stem.slice(0, -'_test'.length);
  }

  const parts = stem.split('_');
  if (parts.length === 0) return true;

  const last = parts[parts.length - 1];
  const secondLast = parts.length >= 2 ? parts[parts.length - 2] : '';

  // Last-two match a known GOOS/GOARCH pair (order matters per Go spec).
  if (
    parts.length >= 2 &&
    KNOWN_GOOSES.has(secondLast) &&
    KNOWN_GOARCHES.has(last)
  ) {
    return secondLast === ctx.goos && last === ctx.goarch;
  }

  // Last alone matches a known GOOS or GOARCH.
  if (KNOWN_GOOSES.has(last)) return last === ctx.goos;
  if (KNOWN_GOARCHES.has(last)) return last === ctx.goarch;

  return true;
}

/**
 * Scan the file header up to the `package` clause and collect constraint
 * comments. The Go spec requires constraints to precede `package` (with
 * a blank line between); we don't enforce the blank-line rule strictly —
 * we just stop at the first `package` line.
 */
function readHeaderConstraints(content: string): {
  goBuild: string | null;
  plusBuild: string[];
} {
  let goBuild: string | null = null;
  const plusBuild: string[] = [];

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('package ') || line === 'package') {
      break;
    }
    if (isGoBuildLine(line)) {
      // The Go spec allows at most one `//go:build` line; `gofmt` and
      // `go vet` flag duplicates as an error. We tolerate them and take
      // the first as a leniency choice — failing the graph over a
      // stylistic issue is worse than silently ignoring the later lines.
      if (goBuild === null) {
        goBuild = line.slice('//go:build'.length).trim();
      }
    } else if (isPlusBuildLine(line)) {
      plusBuild.push(line);
    }
  }

  return { goBuild, plusBuild };
}

/**
 * Strict directive matchers: the directive token must be followed by
 * whitespace or end-of-line. A plain `startsWith` would accept
 * `//go:buildfoo` or `// +builder` as if they were directives.
 */
function isGoBuildLine(line: string): boolean {
  return (
    line === '//go:build' ||
    line.startsWith('//go:build ') ||
    line.startsWith('//go:build\t')
  );
}

function isPlusBuildLine(line: string): boolean {
  return (
    line === '// +build' ||
    line.startsWith('// +build ') ||
    line.startsWith('// +build\t')
  );
}

// --- //go:build expression evaluator ---------------------------------------

type Token =
  | { kind: 'ident'; value: string }
  | { kind: '&&' | '||' | '!' | '(' | ')' };

interface ParseState {
  tokens: Token[];
  pos: number;
}

function evaluateGoBuild(
  expr: string,
  ctx: BuildContext,
  sourceLabel?: string
): boolean {
  const tokens = tokenize(expr, sourceLabel);
  if (tokens.length === 0) {
    // Empty `//go:build` is invalid per spec; fall back to include rather
    // than excluding the file on a malformed constraint.
    if (sourceLabel) {
      logger.warn(
        `Empty //go:build constraint in ${sourceLabel} — treating file as unconstrained.`
      );
    }
    return true;
  }
  const state: ParseState = { tokens, pos: 0 };
  const result = parseOr(state, ctx);
  // Extra tokens or unbalanced parens → treat as include (safe fallback).
  // This catches a common authoring mistake: terms separated by spaces
  // instead of `&&`/`||`. Without a warning the typo silently masquerades
  // as "include the file on every platform."
  if (state.pos < state.tokens.length) {
    if (sourceLabel) {
      logger.warn(
        `Build constraint "//go:build ${expr}" in ${sourceLabel} had ` +
          `trailing tokens after a complete expression; including the file. ` +
          `Did you mean && or || between terms?`
      );
    }
    return true;
  }
  return result;
}

function tokenize(expr: string, sourceLabel?: string): Token[] {
  const tokens: Token[] = [];
  const skipped: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ kind: '(' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ kind: ')' });
      i++;
      continue;
    }
    if (c === '!') {
      tokens.push({ kind: '!' });
      i++;
      continue;
    }
    if (c === '&' && expr[i + 1] === '&') {
      tokens.push({ kind: '&&' });
      i += 2;
      continue;
    }
    if (c === '|' && expr[i + 1] === '|') {
      tokens.push({ kind: '||' });
      i += 2;
      continue;
    }
    if (/[A-Za-z0-9_.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[A-Za-z0-9_.]/.test(expr[j])) j++;
      tokens.push({ kind: 'ident', value: expr.slice(i, j) });
      i = j;
      continue;
    }
    // Unknown character: skip rather than throw. A build constraint is
    // never worth failing graph construction over.
    skipped.push(c);
    i++;
  }
  if (sourceLabel && skipped.length > 0) {
    logger.warn(
      `Build constraint "//go:build ${expr}" in ${sourceLabel} contained ` +
        `unrecognized characters (${JSON.stringify(
          skipped.join('')
        )}); they were ignored.`
    );
  }
  return tokens;
}

// Grammar:
//   or-expr  = and-expr ( '||' and-expr )*
//   and-expr = unary    ( '&&' unary    )*
//   unary    = '!' unary | primary
//   primary  = ident | '(' or-expr ')'

function parseOr(s: ParseState, ctx: BuildContext): boolean {
  let left = parseAnd(s, ctx);
  while (peek(s)?.kind === '||') {
    s.pos++;
    const right = parseAnd(s, ctx);
    left = left || right;
  }
  return left;
}

function parseAnd(s: ParseState, ctx: BuildContext): boolean {
  let left = parseUnary(s, ctx);
  while (peek(s)?.kind === '&&') {
    s.pos++;
    const right = parseUnary(s, ctx);
    left = left && right;
  }
  return left;
}

function parseUnary(s: ParseState, ctx: BuildContext): boolean {
  if (peek(s)?.kind === '!') {
    s.pos++;
    if (!peek(s)) {
      // `!` with no operand. Falling through to `parsePrimary` returns
      // its EOF safe-include of `true`, which the negation would flip to
      // `false` — silently *excluding* the file and violating the
      // over-include policy. Short-circuit to `true` instead.
      return true;
    }
    return !parseUnary(s, ctx);
  }
  return parsePrimary(s, ctx);
}

function parsePrimary(s: ParseState, ctx: BuildContext): boolean {
  const tok = peek(s);
  if (!tok) return true; // safe fallback at EOF
  if (tok.kind === '(') {
    s.pos++;
    const inner = parseOr(s, ctx);
    if (peek(s)?.kind === ')') s.pos++;
    return inner;
  }
  if (tok.kind === 'ident') {
    s.pos++;
    return matchTag(tok.value, ctx);
  }
  // Unexpected operator-in-primary position: include rather than crash.
  return true;
}

function peek(s: ParseState): Token | undefined {
  return s.tokens[s.pos];
}

// --- // +build line evaluator ---------------------------------------------

function evaluateLegacyLine(line: string, ctx: BuildContext): boolean {
  const stripped = line.replace(/^\/\/\s*\+build\s*/, '').trim();
  if (!stripped) return true;
  // Space-separated options are OR'd.
  const options = stripped.split(/\s+/);
  return options.some((option) => evaluateLegacyOption(option, ctx));
}

function evaluateLegacyOption(option: string, ctx: BuildContext): boolean {
  // Comma-separated terms within an option are AND'd. Each term may be
  // prefixed with `!` to negate.
  const terms = option.split(',');
  return terms.every((term) => {
    let id = term;
    let negate = false;
    if (id.startsWith('!')) {
      negate = true;
      id = id.slice(1);
    }
    const match = matchTag(id, ctx);
    return negate ? !match : match;
  });
}

// --- tag matching ---------------------------------------------------------

function matchTag(tag: string, ctx: BuildContext): boolean {
  if (!tag) return false;
  if (tag === ctx.goos) return true;
  if (tag === ctx.goarch) return true;
  if (tag === 'unix' && UNIX_OSES.has(ctx.goos)) return true;
  // Go-version tags: assume the user's compiler satisfies them. Over-
  // including is safer than under-including for graph purposes.
  if (/^go1\.\d+$/.test(tag)) return true;
  // We never invoke cgo from static analysis.
  if (tag === 'cgo') return false;
  if (ctx.tags.has(tag)) return true;
  return false;
}
