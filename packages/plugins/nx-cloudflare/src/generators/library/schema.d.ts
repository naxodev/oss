export interface NxCloudflareLibraryGeneratorSchema {
  name: string;
  directory?: string;
  projectNameAndRootFormat?: ProjectNameAndRootFormat;
  skipFormat?: boolean;
  tags?: string;
  includeBabelRc?: boolean;
  unitTestRunner?: 'jest' | 'vitest' | 'none';
  linter?: Linter;
  testEnvironment?: 'jsdom' | 'node';
  importPath?: string;
  js?: boolean;
  pascalCaseFiles?: boolean;
  strict?: boolean;
  publishable?: boolean;
  buildable?: boolean;
  setParserOptionsProject?: boolean;
  config?: 'workspace' | 'project' | 'npm-scripts';
  compiler?: Compiler;
  bundler?: Bundler;
  skipTypeCheck?: boolean;
  minimal?: boolean;
  rootProject?: boolean;
  simpleName?: boolean;
}

export interface NormalizedSchema extends NxCloudflareLibraryGeneratorSchema {
  libProjectRoot: string;
}
