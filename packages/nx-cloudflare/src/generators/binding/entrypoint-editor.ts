// Pure text transformation for splicing a `queue(batch, env, ctx)` handler
// into a Worker's `src/index.ts`. C3-scaffolded workers ship a default export
// object (`export default { async fetch(...) {...} }`), so the handler is
// inserted as a new method on that object, found by string/comment-aware
// brace matching (not a full TS parse — good enough for the shapes C3 emits,
// and avoids a parser dependency for one generator).
//
// No Tree/fs access here: `source` in, an outcome describing what happened
// out. The caller (the binding generator) does the actual write and any
// user-facing logging, keeping this module trivially unit-testable.
export type AddQueueHandlerOutcome =
  | { status: 'inserted'; source: string }
  | { status: 'already-present' }
  | { status: 'no-default-export' }
  | { status: 'no-closing-brace' };

/**
 * Insert `method` (a full class-method source snippet, e.g.
 * `"  async queue(...) {...},"`) into the default-exported object in `source`.
 *
 * - `already-present`: `source` already declares an `async queue(` handler — a
 *   Worker has a single queue() handler shared by all queue bindings, so the
 *   caller should leave the file untouched.
 * - `source.length === 0`: no entrypoint yet — a brand new one is returned.
 * - `no-default-export`: `source` has no `export default { ... }` object to
 *   insert into (e.g. a class-style entrypoint).
 * - `no-closing-brace`: an `export default {` was found but its matching `}`
 *   could not be located (malformed source).
 */
export function addQueueHandler(
  source: string,
  method: string
): AddQueueHandlerOutcome {
  if (/async\s+queue\s*\(/.test(source)) {
    return { status: 'already-present' };
  }

  if (source.length === 0) {
    return {
      status: 'inserted',
      source: `export default {
${method}
};
`,
    };
  }

  const match = source.match(/export\s+default\s*\{/);
  if (!match) {
    return { status: 'no-default-export' };
  }

  const matchStart = match.index ?? 0;
  const openBraceIndex = source.indexOf('{', matchStart + match[0].length - 1);
  const closeBraceIndex = findMatchingBrace(source, openBraceIndex);
  if (closeBraceIndex === -1) {
    return { status: 'no-closing-brace' };
  }

  // Insert the method before the closing brace. Preserve whatever whitespace
  // precedes the `}` — if the object is `export default {\n}` we insert on a
  // new line; if it's `export default { ... }` we add a newline before the `}`.
  const before = source.slice(0, closeBraceIndex);
  const after = source.slice(closeBraceIndex);
  const needsNewline = before.length > 0 && !before.endsWith('\n');
  const insertion = `${needsNewline ? '\n' : ''}${method}\n`;
  return { status: 'inserted', source: `${before}${insertion}${after}` };
}

// String/comment-aware bracket matcher. Skips braces inside string literals,
// template literals, line comments, and block comments so a `}` in a string
// like `"}}}";` doesn't short-circuit the depth counter and corrupt the file.
function findMatchingBrace(text: string, openIndex: number): number {
  let depth = 0;
  let i = openIndex;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '/' && next === '/') {
      i = text.indexOf('\n', i);
      if (i === -1) return -1;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) return -1;
      i = end + 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipString(text, i, ch);
      if (i === -1) return -1;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

// Advance past a string/template literal starting at `start` (the opening
// quote). Returns the index after the closing quote, or -1 if unterminated.
function skipString(text: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (quote === '`' && text[i] === '$' && text[i + 1] === '{') {
      // Template literal interpolation — skip to the matching `}`
      let depth = 1;
      i += 2;
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
        i++;
      }
      continue;
    }
    if (text[i] === quote) return i + 1;
    i++;
  }
  return -1;
}
