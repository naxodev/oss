export interface LibraryGeneratorSchema {
  name: string;
  directory?: string;
  projectNameAndRootFormat?: 'as-provided' | 'derived';
  tags?: string;
  skipFormat?: boolean;
}
