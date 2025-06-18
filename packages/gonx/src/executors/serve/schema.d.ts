export interface ServeExecutorSchema {
  main?: string;
  cmd?: 'go' | 'tinygo' | 'gow';
  args?: string[];
  env?: Record<string, string>;
}
