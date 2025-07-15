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
}
