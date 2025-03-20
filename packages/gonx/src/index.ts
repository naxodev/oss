// plugin
import { createNodeV2 } from '@nx/devkit';

// Entry point for your plugin
export function plugin(options: { skipGoDependencyCheck?: boolean } = {}) {
  return {
    name: 'gonx',
    createNodeV2: createNodeV2((projectPath) => {
      // This will be implemented later to analyze Go imports
      return {
        projects: [],
        dependencies: []
      };
    })
  };
}

export { applicationGenerator } from './generators/application/generator';
export { libraryGenerator } from './generators/library/generator';
export { buildExecutor } from './executors/build/executor';
export { serveExecutor } from './executors/serve/executor';
export { lintExecutor } from './executors/lint/executor';
export { testExecutor } from './executors/test/executor';
export { tidyExecutor } from './executors/tidy/executor';
export { generateExecutor } from './executors/generate/executor';
