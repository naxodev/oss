import { readFileSync } from 'fs';
import { GoModInfo } from '../types/go-mod-info';

/**
 * Regex to match module declaration.
 * Supports quoted paths (double quotes, single quotes, backticks) and unquoted.
 * Group 1: quoted path content, Group 2: unquoted path
 */
const MODULE_REGEX = /^\s*module\s+(?:["'`]([^"'`]+)["'`]|(\S+))/m;

/**
 * Regex to match single-line replace directive (with "replace" keyword).
 * Pattern: replace old => new
 * Handles optional version specifiers on both sides.
 */
const REPLACE_SINGLE_LINE_REGEX =
  /^\s*replace\s+(?:["'`]([^"'`]+)["'`]|(\S+))(?:\s+\S+)?\s+=>\s+(?:["'`]([^"'`]+)["'`]|(\S+))(?:\s+\S+)?\s*$/;

/**
 * Regex to match replace block start.
 */
const REPLACE_BLOCK_START_REGEX = /^\s*replace\s*\(\s*$/;

/**
 * Regex to match a line within a replace block (no "replace" keyword).
 * Pattern: old => new (with optional versions)
 */
const REPLACE_BLOCK_LINE_REGEX =
  /^\s*(?:["'`]([^"'`]+)["'`]|(\S+))(?:\s+\S+)?\s+=>\s+(?:["'`]([^"'`]+)["'`]|(\S+))(?:\s+\S+)?\s*$/;

/**
 * Parses a go.mod file and extracts module information.
 *
 * @param filePath - Path to the go.mod file
 * @returns GoModInfo object or null if parsing fails
 */
export function parseGoMod(filePath: string): GoModInfo | null {
  let content: string;

  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  // Remove comments (both // and /* */)
  const contentWithoutComments = removeComments(content);

  // Extract module path
  const moduleMatch = MODULE_REGEX.exec(contentWithoutComments);
  if (!moduleMatch) {
    return null;
  }

  const modulePath = moduleMatch[1] || moduleMatch[2];
  // Reject empty or quote-only paths (e.g., module "" is invalid)
  if (!modulePath || /^["'`]+$/.test(modulePath)) {
    return null;
  }

  const replaceDirectives = new Map<string, string>();

  // Parse line by line to properly handle single-line vs block directives
  const lines = contentWithoutComments.split('\n');
  let inReplaceBlock = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Check for block start
    if (REPLACE_BLOCK_START_REGEX.test(trimmedLine)) {
      inReplaceBlock = true;
      continue;
    }

    // Check for block end
    if (inReplaceBlock && trimmedLine === ')') {
      inReplaceBlock = false;
      continue;
    }

    if (inReplaceBlock) {
      // Inside a block - use block line regex (no "replace" keyword)
      const match = REPLACE_BLOCK_LINE_REGEX.exec(trimmedLine);
      if (match) {
        const oldPath = match[1] || match[2];
        const newPath = match[3] || match[4];
        if (oldPath && newPath) {
          replaceDirectives.set(oldPath, newPath);
        }
      }
    } else {
      // Outside a block - check for single-line replace directive
      const match = REPLACE_SINGLE_LINE_REGEX.exec(trimmedLine);
      if (match) {
        const oldPath = match[1] || match[2];
        const newPath = match[3] || match[4];
        if (oldPath && newPath) {
          replaceDirectives.set(oldPath, newPath);
        }
      }
    }
  }

  return {
    modulePath,
    replaceDirectives,
  };
}

/**
 * Removes Go-style comments from content.
 */
function removeComments(content: string): string {
  // Remove multi-line comments
  let result = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line comments but preserve the newline
  result = result.replace(/\/\/.*$/gm, '');

  return result;
}
