export interface Schema {
  name: string;
  template?: 'fetch-handler' | 'scheduled-handler' | 'hono' | 'none';
  js?: boolean;
  unitTestRunner?: 'vitest' | 'none';
  directory?: string;
  rootProject?: boolean;
  tags?: string;
  frontendProject?: string;
  skipFormat?: boolean;
  port?: number;
  accountId?: string;
}

export interface NormalizedSchema extends Schema {
  appProjectRoot: string;
}
