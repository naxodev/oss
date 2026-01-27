/**
 * Result of building the import map for the workspace.
 */
export interface ImportMapResult {
  /**
   * Base mapping of module paths to Nx project names.
   * e.g., "github.com/myorg/shared" -> "libs/shared"
   */
  baseImportMap: Map<string, string>;

  /**
   * Per-project replace directive mappings.
   * Outer key: project name (source project)
   * Inner map: old module path -> new module path or null (for suppression)
   *
   * null value indicates the import should be suppressed (e.g., points to
   * a non-Nx directory).
   */
  projectReplaceDirectives: Map<string, Map<string, string | null>>;
}
