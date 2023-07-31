export interface Schema {
  name: string;
  template: 'Fetch handler' | 'Scheduled handler' | 'None';
  js: boolean;
  unitTestRunner: 'vitest' | 'none';
  directory?: string;
  rootProject?: boolean;
  tags?: string;
  frontendProject?: string;
  port?: number;
}

export interface NormalizedSchema extends Schema {
  appProjectRoot: string;
  parsedTags: string[];
}
