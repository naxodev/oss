export interface BuildExecutorSchema {
  compiler?: 'go' | 'tinygo' | 'gow';
  outputPath?: string;
  buildMode?: string;
  env?: { [key: string]: string };
  flags?: string[];
}
