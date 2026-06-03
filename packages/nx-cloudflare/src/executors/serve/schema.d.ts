export interface ServeSchema {
  name?: string;
  noBundle?: boolean;
  env?: string;
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  ip?: string;
  port?: number;
  inspectorPort?: number;
  routes?: string[];
  host?: string;
  localProtocol?: 'http' | 'https';
  assets?: string;
  var?: string[];
  define?: string[];
  tsconfig?: string;
  minify?: boolean;
  persistTo?: string;
  remote?: boolean;
  testScheduled?: boolean;
  logLevel?: 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none';
}
