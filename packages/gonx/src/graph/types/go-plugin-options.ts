/**
 * Strategy for detecting dependencies between Go projects.
 *
 * - `go-runtime`: Uses `go list -m -json` command (requires Go installed)
 * - `static-analysis`: Uses tree-sitter WASM parsing (no Go required)
 * - `auto`: Tries go-runtime first, falls back to static-analysis if Go unavailable
 */
export type DependencyStrategy = 'go-runtime' | 'static-analysis' | 'auto';

// Expected format of the plugin options defined in nx.json
export interface GoPluginOptions {
  buildTargetName?: string;
  testTargetName?: string;
  runTargetName?: string;
  tidyTargetName?: string;
  lintTargetName?: string;
  generateTargetName?: string;
  releasePublishTargetName?: string;
  tagName?: string;
  /**
   * If true, the plugin will not require
   * to have Go installed to compute a Nx workspace graph.
   *
   * Be aware that if Go is not installed, the plugin will not be able
   * to detect dependencies between Go projects and this is source of misunderstanding.
   */
  skipGoDependencyCheck?: boolean;
  /**
   * Strategy for detecting dependencies between Go projects.
   *
   * - `go-runtime` (default): Uses `go list -m -json` command (requires Go installed)
   * - `static-analysis`: Uses tree-sitter WASM parsing (no Go required)
   * - `auto`: Tries go-runtime first, falls back to static-analysis if Go unavailable
   */
  dependencyStrategy?: DependencyStrategy;
}
