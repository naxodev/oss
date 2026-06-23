export interface InitGeneratorSchema {
  /** Test runner to use for unit tests. */
  unitTestRunner?: 'vitest' | 'jest' | 'none';
  /** Skip formatting files. */
  skipFormat?: boolean;
  /** Use JavaScript instead of TypeScript. */
  js?: boolean;
}
