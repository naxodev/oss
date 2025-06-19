export interface ServeExecutorSchema {
  cmd?: 'go' | 'tinygo' | 'gow';
  args?: string[];
  env?: Record<string, string>;
}
