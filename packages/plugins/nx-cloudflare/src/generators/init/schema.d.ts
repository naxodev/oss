export interface Schema {
  unitTestRunner?: 'vitest' | 'jest' | 'none';
  skipFormat?: boolean;
  js?: boolean;
}
