import type { ProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';

export type Bundler = 'swc' | 'tsc' | 'rollup' | 'vite' | 'esbuild' | 'none';

export interface NxCloudflareLibraryGeneratorSchema {
  directory: string;
  name?: string;
  skipFormat?: boolean;
  linter?: Linter;
  tags?: string;
  skipTsConfig?: boolean;
  skipPackageJson?: boolean;
  unitTestRunner?: 'vitest' | 'none';
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
  useProjectJson?: boolean;
}

export interface NormalizedSchema extends NxCloudflareLibraryGeneratorSchema {
  name: string;
  projectNames: ProjectNameAndRootOptions['names'];
  fileName: string;
  projectRoot: string;
  parsedTags: string[];
  importPath?: string;
  hasPlugin: boolean;
  isUsingTsSolutionConfig: boolean;
}
