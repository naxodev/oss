// Expected format of the plugin options defined in nx.json
export interface GoPluginOptions {
  buildTargetName?: string;
  testTargetName?: string;
  runTargetName?: string;
  tidyTargetName?: string;
  lintTargetName?: string;
  releasePublishTargetName?: string;
  tagName?: string;
}
