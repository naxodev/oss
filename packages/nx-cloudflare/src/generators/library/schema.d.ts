import type { ProjectNameAndRootOptions } from '@nx/devkit';

export type Bundler = 'swc' | 'tsc' | 'rollup' | 'vite' | 'esbuild' | 'none';

export interface NxCloudflareLibraryGeneratorSchema {
  /** The directory of the new library. */
  directory: string;
  /** The name of the library. */
  name?: string;
  /** Skip formatting files. */
  skipFormat?: boolean;
  /** The tool to use for running lint checks. */
  linter?: Linter;
  /** Add tags to the library (used for linting). */
  tags?: string;
  /** Do not update tsconfig.json for development experience. */
  skipTsConfig?: boolean;
  /** Do not add dependencies to `package.json`. */
  skipPackageJson?: boolean;
  /** Test runner to use for unit tests. */
  unitTestRunner?: 'vitest' | 'none';
  /** Generate JavaScript files rather than TypeScript files. */
  js?: boolean;
  /** Whether to enable tsconfig strict mode or not. */
  strict?: boolean;
  /** Generate a publishable library. */
  publishable?: boolean;
  /** The library name used to import it, like @myorg/my-awesome-lib. Required for publishable library. */
  importPath?: string;
  /** Whether or not to configure the ESLint `parserOptions.project` option. */
  setParserOptionsProject?: boolean;
  /** Determines whether the project's executors should be configured in `workspace.json`, `project.json` or as npm scripts. */
  config?: 'workspace' | 'project' | 'npm-scripts';
  /** The bundler to use. Choosing 'none' means this library is not buildable. */
  bundler?: Bundler;
  /** Whether to skip TypeScript type checking for SWC compiler. */
  skipTypeCheck?: boolean;
  /** Generate a library with a minimal setup. No README.md generated. */
  minimal?: boolean;
  /** Whether the library is generated as the workspace root project. */
  rootProject?: boolean;
  /** Don't include the directory in the generated file name. */
  simpleName?: boolean;
  /** Write an explicit project.json instead of relying on target inference. */
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
