import { readFile } from 'fs/promises';
import { initParser, SyntaxNode } from './parser-init';

/**
 * Extracts import paths from a Go source file using tree-sitter.
 *
 * Handles all Go import patterns:
 * - Single imports: import "fmt"
 * - Grouped imports: import ("fmt"; "strings")
 * - Aliased imports: import f "fmt"
 * - Dot imports: import . "testing"
 * - Blank imports: import _ "image/png"
 * - Raw string literals: import `path`
 *
 * Filters out the cgo pseudo-import "C".
 *
 * @param filePath - Path to the Go source file
 * @returns Array of import paths (excluding "C")
 */
export async function extractImports(filePath: string): Promise<string[]> {
  let content: string;

  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return [];
  }

  if (!content.trim()) {
    return [];
  }

  const parser = await initParser();
  const tree = parser.parse(content);

  const imports: string[] = [];

  // Find all import_declaration nodes
  visitImportDeclarations(tree.rootNode, (node) => {
    // Handle import_spec_list (grouped imports)
    const specList = node.namedChildren.find(
      (child) => child.type === 'import_spec_list'
    );

    if (specList) {
      // Multiple imports in parentheses
      for (const spec of specList.namedChildren) {
        if (spec.type === 'import_spec') {
          const importPath = extractImportPath(spec);
          if (importPath && importPath !== 'C') {
            imports.push(importPath);
          }
        }
      }
    } else {
      // Single import
      const spec = node.namedChildren.find(
        (child) => child.type === 'import_spec'
      );
      if (spec) {
        const importPath = extractImportPath(spec);
        if (importPath && importPath !== 'C') {
          imports.push(importPath);
        }
      }
    }
  });

  return imports;
}

/**
 * Visits all import_declaration nodes in the AST.
 */
function visitImportDeclarations(
  node: SyntaxNode,
  callback: (node: SyntaxNode) => void
): void {
  if (node.type === 'import_declaration') {
    callback(node);
  }

  for (const child of node.children) {
    visitImportDeclarations(child, callback);
  }
}

/**
 * Extracts the import path from an import_spec node.
 *
 * An import_spec can have:
 * - Just a path: "fmt"
 * - Alias and path: f "fmt"
 * - Dot and path: . "testing"
 * - Blank and path: _ "image/png"
 */
function extractImportPath(spec: SyntaxNode): string | null {
  // Find the interpreted_string_literal or raw_string_literal child
  for (const child of spec.namedChildren) {
    if (
      child.type === 'interpreted_string_literal' ||
      child.type === 'raw_string_literal'
    ) {
      // Remove quotes (both " and `)
      const text = child.text;
      if (text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1);
      }
      if (text.startsWith('`') && text.endsWith('`')) {
        return text.slice(1, -1);
      }
    }
  }

  return null;
}
