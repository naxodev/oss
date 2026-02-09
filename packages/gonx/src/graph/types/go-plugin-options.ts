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
   * If true, dependency detection between Go projects is disabled entirely.
   */
  skipGoDependencyCheck?: boolean;
}
