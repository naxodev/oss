export interface NxCloudflareLibraryGeneratorSchema {
  name: string;
  directory?: string;
  projectNameAndRootFormat?: ProjectNameAndRootFormat;
  linter?: Linter;
  unitTestRunner?: 'vitest' | 'none';
  tags?: string;
  skipFormat?: boolean;
  skipPackageJson?: boolean;
  skipTsConfig?: boolean;
  js?: boolean;
  strict?: boolean;
  publishable?: boolean;
  importPath?: string;
  setParserOptionsProject?: boolean;
  config?: 'workspace' | 'project' | 'npm-scripts';
  bundler?: Bundler;
  skipTypeCheck?: boolean;
  minimal?: boolean;
  rootProject?: boolean;
  simpleName?: boolean;
}

export interface NormalizedSchema extends NxCloudflareLibraryGeneratorSchema {
  libProjectRoot: string;
}
