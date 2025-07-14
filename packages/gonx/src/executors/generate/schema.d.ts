export interface GenerateExecutorSchema {
  compiler?: 'go' | 'tinygo' | 'gow';
  env?: Record<string, string>;
  flags?: string[];
}
