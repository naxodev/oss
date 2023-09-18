export interface NxCloudflareLibraryGeneratorSchema {
  name: string;
  directory?: string;
  projectNameAndRootFormat?: ProjectNameAndRootFormat;
  skipFormat?: boolean;
  tags?: string;
  unitTestRunner?: 'vitest' | 'none';
  linter?: Linter;
  importPath?: string;
  js?: boolean;
  strict?: boolean;
  publishable?: boolean;
  bundler?: Bundler;
  minimal?: boolean;
  config?: 'workspace' | 'project' | 'npm-scripts';
  rootProject?: boolean;
  simpleName?: boolean;
}

export interface NormalizedSchema extends NxCloudflareLibraryGeneratorSchema {
  libProjectRoot: string;
}
