/**
 * Tree-sitter parser initialization and management.
 * Provides a singleton parser instance with Go language support.
 */
import * as path from 'path';

// Tree-sitter types
interface Parser {
  setLanguage(language: unknown): void;
  parse(input: string): Tree;
}

interface Tree {
  rootNode: SyntaxNode;
}

interface SyntaxNode {
  type: string;
  text: string;
  children: SyntaxNode[];
  namedChildren: SyntaxNode[];
  childForFieldName(name: string): SyntaxNode | null;
}

// Type for the tree-sitter module
interface TreeSitterModule {
  init(): Promise<void>;
  new (): Parser;
  Language: {
    load(wasmPath: string): Promise<unknown>;
  };
}

// Singleton state
let parserInstance: Parser | null = null;
let initPromise: Promise<Parser> | null = null;

/**
 * Gets the path to the tree-sitter-go.wasm file.
 */
function getWasmPath(): string {
  // In CommonJS, we can use require.resolve to find the package
  const packageJsonPath = require.resolve('tree-sitter-go/package.json');
  return path.join(path.dirname(packageJsonPath), 'tree-sitter-go.wasm');
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

  initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<Parser> {
  // Dynamic import of web-tree-sitter
  const treeSitterModule = await import('web-tree-sitter');
  // Handle both ESM default export and CommonJS
  const TreeSitter: TreeSitterModule =
    (treeSitterModule as { default?: TreeSitterModule }).default ||
    (treeSitterModule as unknown as TreeSitterModule);

  // Initialize the tree-sitter runtime
  await TreeSitter.init();

  // Create parser instance
  const parser = new TreeSitter();

  // Load Go language
  const wasmPath = getWasmPath();
  let Go: unknown;
  try {
    Go = await TreeSitter.Language.load(wasmPath);
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
