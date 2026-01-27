/**
 * Information parsed from a go.mod file.
 */
export interface GoModInfo {
  /**
   * The module path declared in the go.mod file.
   * e.g., "github.com/myorg/myapp"
   */
  modulePath: string;

  /**
   * Replace directives mapping old module paths to new paths.
   * Values can be local paths (e.g., "../common") or module paths.
   */
  replaceDirectives: Map<string, string>;
}
