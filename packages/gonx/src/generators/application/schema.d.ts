export interface ApplicationGeneratorSchema {
  name: string;
  directory?: string;
  projectNameAndRootFormat?: 'as-provided' | 'derived';
  tags?: string;
  skipFormat?: boolean;
}
