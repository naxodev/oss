// plugin
import {
  CreateNodesContextV2,
  TargetConfiguration,
  createNodesFromFiles,
  joinPathFragments,
} from '@nx/devkit';

// Plugin options interface
export interface GoPluginOptions {
  skipGoDependencyCheck?: boolean;
  buildTargetName?: string;
  serveTargetName?: string;
  testTargetName?: string;
  lintTargetName?: string;
  tidyTargetName?: string;
}

// File glob to find all the go.mod files
const goModGlob = '**/go.mod';

// Entry function that Nx calls to modify the graph
export const createNodesV2 = [
  goModGlob,
  async (configFiles, options, ctx) => {
    const resolvedOptions = {
      buildTargetName: 'build',
      serveTargetName: 'serve',
      testTargetName: 'test',
      lintTargetName: 'lint',
      tidyTargetName: 'tidy',
      ...options,
    };

    return await createNodesFromFiles(
      (configFile, opts, context) =>
        createNodesInternal(configFile, resolvedOptions, context),
      configFiles,
      options,
      ctx
    );
  },
];

async function createNodesInternal(
  configFilePath: string,
  options: GoPluginOptions,
  context: CreateNodesContextV2
) {
  // Use the context parameter to get the workspace root
  const workspaceRoot = context.workspaceRoot;
  const projectRoot = joinPathFragments(configFilePath, '..');

  // Log for debugging if needed
  if (process.env.DEBUG) {
    console.log(
      `Processing Go project at ${joinPathFragments(
        workspaceRoot,
        projectRoot
      )}`
    );
  }

  // Build target configuration
  const buildTarget: TargetConfiguration = {
    command: 'go build',
    options: { cwd: projectRoot },
    cache: true,
    inputs: [
      '{projectRoot}/go.mod',
      '{projectRoot}/go.sum',
      '{projectRoot}/**/*.go',
      {
        externalDependencies: ['go'],
      },
    ],
    outputs: ['{projectRoot}/bin'],
  };

  // Test target configuration
  const testTarget: TargetConfiguration = {
    command: 'go test ./...',
    options: { cwd: projectRoot },
  };

  // Lint target configuration
  const lintTarget: TargetConfiguration = {
    command: 'go fmt ./...',
    options: { cwd: projectRoot },
  };

  // Serve target configuration
  const serveTarget: TargetConfiguration = {
    command: 'go run main.go',
    options: { cwd: projectRoot },
  };

  // Tidy target configuration
  const tidyTarget: TargetConfiguration = {
    command: 'go mod tidy',
    options: { cwd: projectRoot },
  };

  // Project configuration to be merged
  return {
    projects: {
      [projectRoot]: {
        targets: {
          [options.buildTargetName]: buildTarget,
          [options.testTargetName]: testTarget,
          [options.lintTargetName]: lintTarget,
          [options.serveTargetName]: serveTarget,
          [options.tidyTargetName]: tidyTarget,
        },
      },
    },
  };
}

export { applicationGenerator } from './generators/application/generator';
export { libraryGenerator } from './generators/library/generator';
export { buildExecutor } from './executors/build/executor';
export { serveExecutor } from './executors/serve/executor';
export { lintExecutor } from './executors/lint/executor';
export { testExecutor } from './executors/test/executor';
export { tidyExecutor } from './executors/tidy/executor';
