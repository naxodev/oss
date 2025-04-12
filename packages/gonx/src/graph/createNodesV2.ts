import { CreateNodesV2, createNodesFromFiles } from '@nx/devkit';
import { GoPluginOptions } from './types/go-plugin-options';
import { createNodesInternal } from './utils/create-nodes-internal';

// NOTE: LIMITATION: This assumes the name of the package from the last part of the path.
// So having two package with the same name in different directories will cause issues.

// File glob to find all Go projects
const goModGlob = '**/go.mod';

// Entry function that Nx calls to modify the graph
export const createNodesV2: CreateNodesV2<GoPluginOptions> = [
  goModGlob,
  (configFiles, options, context) => {
    return createNodesFromFiles(
      (configFile, options, context) =>
        createNodesInternal(configFile, options, context),
      configFiles,
      options,
      context
    );
  },
];
