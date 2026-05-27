/**
 * Resolution of a single `replace` directive after it has been classified
 * against the workspace's project graph.
 *
 * `remap`    — rewrite the import path to `to` before resolving it through
 *              the base import map. Used both for module-to-module
 *              replacements (`replace foo => bar`) and for local-path
 *              replacements that land on an Nx project (in which case `to`
 *              is the target project's module path).
 *
 * `suppress` — the directive points somewhere that is intentionally NOT a
 *              dependency edge (a local path outside the workspace, a
 *              vendored copy, a target without a parseable `go.mod`).
 *              Resolution must return `null` so no edge is created.
 *
 * Modelled as a tagged union rather than `string | null` so consumers can
 * pattern-match on `kind` instead of conflating "no entry in the map" with
 * "entry exists but means suppress" — two cases with different semantics.
 */
export type Replacement =
  | { readonly kind: 'remap'; readonly to: string }
  | { readonly kind: 'suppress' };

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
   * Outer key: project name (source project).
   * Inner map: old module path -> {@link Replacement}.
   */
  projectReplaceDirectives: Map<string, Map<string, Replacement>>;
}
