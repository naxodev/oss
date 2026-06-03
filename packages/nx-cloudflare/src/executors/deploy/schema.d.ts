// All fields are optional: schema.json declares `required: []`, so Nx only
// populates options the user passed plus the few defaulted booleans. Marking
// them required would be a false invariant (mirrors ServeSchema's style).
export interface DeployExecutorSchema {
  name?: string;
  noBundle?: boolean;
  env?: string;
  outdir?: string;
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  assets?: string;
  var?: string[];
  define?: string[];
  triggers?: string[];
  routes?: string[];
  tsconfig?: string;
  minify?: boolean;
  dryRun?: boolean;
  keepVars?: boolean;
}
