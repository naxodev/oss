export interface Schema {
  directory: string;
  name?: string;
  template?: 'fetch-handler' | 'scheduled-handler' | 'hono' | 'none';
  js?: boolean;
  unitTestRunner?: 'vitest' | 'none';
  tags?: string;
  skipFormat?: boolean;
  port?: number;
  accountId?: string;
}

export interface NormalizedSchema extends Schema {
  projectName: string;
  projectRoot: string;
  projectType: ProjectType;
  parsedTags: string[];
}
