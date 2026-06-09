export interface InitGeneratorSchema {
  unitTestRunner?: 'vitest' | 'jest' | 'none';
  skipFormat?: boolean;
  js?: boolean;
}
