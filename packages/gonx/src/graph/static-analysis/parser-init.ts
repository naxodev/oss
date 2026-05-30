/**
 * Tree-sitter parser initialization and management.
 * Provides a singleton parser instance with Go language support.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
// `import type` is fully erased at runtime, so this does not move the
// dynamic `import('web-tree-sitter')` below to module-load time. The local
// `Node as SyntaxNode` alias keeps the historical name used throughout this
// plugin while binding to the real upstream class.
import type { Parser, Tree, Node as SyntaxNode } from 'web-tree-sitter';

// Singleton state
let parserInstance: Parser | null = null;
let initPromise: Promise<Parser> | null = null;

/**
 * Gets the path to the tree-sitter-go.wasm file.
 */
function getWasmPath(): string {
  const packageJsonPath = require.resolve('tree-sitter-go/package.json');
  return join(dirname(packageJsonPath), 'tree-sitter-go.wasm');
}

/**
 * Initializes the tree-sitter parser with Go language support.
 * Uses a singleton pattern - only initializes once.
 *
 * @returns Promise resolving to the initialized parser
 */
export async function initParser(): Promise<Parser> {
  // Return existing instance if available
  if (parserInstance) {
    return parserInstance;
  }

  // Return existing initialization promise to prevent concurrent init
  if (initPromise) {
    return initPromise;
  }

  // Reset `initPromise` on rejection so a transient failure (EMFILE on the
  // sync WASM read, a flaky filesystem, etc.) doesn't poison the singleton
  // for the lifetime of the nx daemon process. Without this, every later
  // caller would re-await the same rejected promise and the parser would
  // be permanently broken until the process restarts.
  initPromise = doInit().catch((err) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}

async function doInit(): Promise<Parser> {
  const { Parser: TreeSitterParser, Language } = await import(
    'web-tree-sitter'
  );

  await TreeSitterParser.init();
  const parser = new TreeSitterParser();

  const wasmPath = getWasmPath();
  let Go;
  try {
    // Read the WASM file ourselves and pass the bytes. Given a path string,
    // web-tree-sitter's `Language.load` reads it via a dynamic
    // `import('fs/promises')`, which throws under Jest's VM
    // (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG). Passing a Uint8Array
    // takes the buffer branch and avoids that dynamic import. The
    // `new Uint8Array` wrap converts Node's `Buffer` (typed as
    // `Uint8Array<ArrayBufferLike>`) into the `Uint8Array<ArrayBuffer>` the
    // signature expects.
    const wasmBytes = new Uint8Array(readFileSync(wasmPath));
    Go = await Language.load(wasmBytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load tree-sitter-go WASM file at "${wasmPath}": ${message}. ` +
        `Ensure tree-sitter-go is installed correctly.`
    );
  }
  parser.setLanguage(Go);

  parserInstance = parser;
  return parser;
}

/**
 * Resets the parser singleton (useful for testing).
 */
export function resetParser(): void {
  parserInstance = null;
  initPromise = null;
}

export type { Parser, Tree, SyntaxNode };
