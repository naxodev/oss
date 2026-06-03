export interface DeployExecutorSchema {
  name: string;
  noBundle: boolean;
  env: string;
  outdir: string;
  compatibilityDate: string;
  compatibilityFlags: string[];
  assets: string;
  var: string[];
  define: string[];
  triggers: string[];
  routes: string[];
  tsconfig: string;
  minify: boolean;
  dryRun: boolean;
  keepVars: boolean;
}
