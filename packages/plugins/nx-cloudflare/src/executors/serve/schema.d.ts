export interface ServeSchema {
  name?: string;
  noBundle?: boolean;
  env?: string;
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  latest?: boolean;
  ip?: string;
  port?: number;
  inspectorPort?: number;
  routes?: string[];
  host?: string;
  localProtocol?: 'http' | 'https';
  localUpstream?: string;
  assets?: string;
  site?: string;
  siteInclude?: string[];
  siteExclude?: string[];
  upstreamProtocol?: 'http' | 'https';
  var?: string[];
  define?: string[];
  tsconfig?: string;
  minify?: boolean;
  nodeCompat?: boolean;
  persistTo?: string;
  remote?: boolean;
  testScheduled?: boolean;
  logLevel?: 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none';
}
