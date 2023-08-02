export interface Schema {
  name: string;
  template?: 'fetch-handler' | 'scheduled-handler' | 'none';
  js?: boolean;
  unitTestRunner?: 'vitest' | 'jest' | 'none';
  directory?: string;
  rootProject?: boolean;
  tags?: string;
  frontendProject?: string;
  skipFormat?: boolean;
  port?: number;
}

export interface NormalizedSchema extends Schema {
  appProjectRoot: string;
}
