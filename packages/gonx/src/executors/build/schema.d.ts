export interface BuildExecutorSchema {
  main: string;
  compiler?: string;
  outputPath?: string;
  buildMode?: string;
  env?: Record<string, string>;
  flags?: string[];
}
