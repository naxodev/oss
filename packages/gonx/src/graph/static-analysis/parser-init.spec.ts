// Contract test for the tree-sitter WASM bytes-loading workaround (#104).
//
// This suite deliberately does NOT mock `web-tree-sitter`. The whole reason
// `parser-init` reads the WASM file itself and passes a `Uint8Array` to
// `Language.load` is that web-tree-sitter's own dynamic `import()` of the WASM
// URL throws under Jest's VM (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG).
// These tests pin that the real bytes overload works and yields a functioning
// Go parser, so a `web-tree-sitter` upgrade that drops or changes that overload
// fails loudly here instead of silently breaking graph construction.

import { describe, it, expect, afterEach } from 'bun:test';
import { initParser, resetParser } from './parser-init';

afterEach(() => {
  resetParser();
});

describe('initParser (WASM bytes-loading contract)', () => {
  it('loads the Go grammar from bytes and parses a Go source file', async () => {
    const parser = await initParser();

    const tree = parser.parse('package main\n\nimport "fmt"\n');
    if (!tree) throw new Error('expected a parse tree from valid Go source');

    const root = tree.rootNode;
    expect(root.type).toBe('source_file');
    expect(root.hasError).toBe(false);
    // The grammar actually loaded — a real import declaration is recognized.
    expect(
      root.namedChildren.some((child) => child?.type === 'import_declaration')
    ).toBe(true);
  });

  it('reuses the same parser instance across calls (singleton)', async () => {
    const first = await initParser();
    const second = await initParser();
    expect(second).toBe(first);
  });
});
