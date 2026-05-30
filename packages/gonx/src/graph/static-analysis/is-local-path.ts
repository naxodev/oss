/**
 * Determines if a path in a replace directive is a local filesystem path
 * or a module path.
 *
 * According to Go's module documentation:
 * - If the first path element contains a dot, it's treated as a module path
 * - Otherwise, it's a local path
 *
 * Examples:
 * - "./common" -> local
 * - "../libs/common" -> local
 * - "/absolute/path" -> local
 * - "github.com/foo/bar" -> module
 * - "example.com/pkg" -> module
 */
export function isLocalPath(source: string): boolean {
  // Explicitly relative or absolute paths
  if (
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('/')
  ) {
    return true;
  }

  // Check first path element for a dot.
  // Module paths always have a dot in the first element (e.g., "github.com", "example.org").
  // Local paths don't (e.g., "common", "mypackage").
  // So: no dot = local path, has dot = module path.
  const firstElement = source.split('/')[0];
  return !firstElement.includes('.');
}
