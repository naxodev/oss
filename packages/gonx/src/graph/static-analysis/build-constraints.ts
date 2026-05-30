/**
 * Go build-constraint evaluation for static dependency analysis.
 *
 * Supports both forms:
 *  - Modern `//go:build` (boolean expression with `&&`, `||`, `!`, parens)
 *  - Legacy `// +build` (OR-of-AND term lists; multiple lines AND'd)
 *
 * When both are present (a transitional state Go's toolchain leaves
 * during `go fmt` runs), `//go:build` wins per the spec.
 *
 * Known limitations (tracked separately, not in scope here):
 *  - Filename-based suffixes (e.g. `foo_linux.go`) are NOT honored — only
 *    in-source constraint comments are.
 *  - `go1.X` version tags are treated as always-true: we have no compiler
 *    handy to consult, and over-including is safer than under-including
 *    for graph computation.
 *  - The pseudo-tag `cgo` is treated as false (static analysis never runs
 *    cgo).
 */

import { platform, arch } from 'os';

export interface BuildContext {
  readonly goos: string;
  readonly goarch: string;
  /** User-supplied tags (e.g. `integration`, `debug`). Empty by default. */
  readonly tags?: ReadonlySet<string>;
}

/** Unix-like GOOS values per Go's `runtime` package classification. */
const UNIX_OSES: ReadonlySet<string> = new Set([
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

function nodePlatformToGoos(p: NodeJS.Platform): string {
  switch (p) {
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
    case 'freebsd':
      return 'freebsd';
    case 'openbsd':
      return 'openbsd';
    case 'sunos':
      return 'solaris';
    case 'aix':
      return 'aix';
    default:
      // Best-effort: pass through unknown platforms (e.g. android, cygwin).
      return p;
  }
}

function nodeArchToGoarch(a: string): string {
  switch (a) {
    case 'x64':
      return 'amd64';
    case 'ia32':
      return '386';
    case 'arm64':
      return 'arm64';
    case 'arm':
      return 'arm';
    case 'ppc64':
      return 'ppc64';
    case 's390x':
      return 's390x';
    case 'mips':
      return 'mips';
    case 'mipsel':
      return 'mipsle';
    case 'riscv64':
      return 'riscv64';
    case 'loong64':
      return 'loong64';
    default:
      return a;
  }
}

/**
 * Derive a default `BuildContext` from the current Node process.
 * The result is process-stable — safe to memoize at module level.
 */
export function getDefaultBuildContext(): BuildContext {
  return {
    goos: nodePlatformToGoos(platform()),
    goarch: nodeArchToGoarch(arch()),
  };
}

/**
 * Decide whether a Go source file should be considered for import
 * extraction given its content and a build context. Returns `true` when
 * no recognized build constraint is present.
 */
export function shouldIncludeFile(content: string, ctx: BuildContext): boolean {
  const { goBuild, plusBuild } = readHeaderConstraints(content);
  if (goBuild !== null) {
    return evaluateGoBuild(goBuild, ctx);
  }
  if (plusBuild.length > 0) {
    // Multiple `// +build` lines are AND'd per the legacy spec.
    return plusBuild.every((line) => evaluateLegacyLine(line, ctx));
  }
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
    if (line.startsWith('//go:build')) {
      // Per spec: the first build constraint in the file wins.
      if (goBuild === null) {
        goBuild = line.slice('//go:build'.length).trim();
      }
    } else if (line.startsWith('// +build')) {
      plusBuild.push(line);
    }
  }

  return { goBuild, plusBuild };
}

// --- //go:build expression evaluator ---------------------------------------

type Token =
  | { kind: 'ident'; value: string }
  | { kind: '&&' | '||' | '!' | '(' | ')' };

interface ParseState {
  tokens: Token[];
  pos: number;
}

function evaluateGoBuild(expr: string, ctx: BuildContext): boolean {
  const tokens = tokenize(expr);
  if (tokens.length === 0) {
    // Empty `//go:build` is invalid per spec; fall back to include rather
    // than excluding the file on a malformed constraint.
    return true;
  }
  const state: ParseState = { tokens, pos: 0 };
  const result = parseOr(state, ctx);
  // Extra tokens or unbalanced parens → treat as include (safe fallback).
  if (state.pos < state.tokens.length) return true;
  return result;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
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
    i++;
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
  if (ctx.tags?.has(tag)) return true;
  return false;
}
