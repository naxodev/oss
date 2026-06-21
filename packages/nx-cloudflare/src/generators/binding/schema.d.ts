export type BindingType =
  | 'kv'
  | 'r2'
  | 'd1'
  | 'do'
  | 'queue'
  | 'workflow'
  | 'service';

export interface Schema {
  project: string;
  type: BindingType;
  binding: string;
  name?: string;
  id?: string;
  databaseName?: string;
  bucketName?: string;
  create?: boolean;
  skipTests?: boolean;
  skipFormat?: boolean;
  skipTypegen?: boolean;
}

export interface NormalizedSchema extends Schema {
  projectRoot: string;
  className: string;
  fileName: string;
  queueName: string;
  serviceName: string;
  configPath: string;
}
