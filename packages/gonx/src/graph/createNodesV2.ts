import { CreateNodesV2, createNodesFromFiles } from '@nx/devkit';
import { GoPluginOptions } from './types/go-plugin-options';
import { createNodesInternal } from './utils/create-nodes-internal';

// NOTE: We use the full project path as the project name to ensure uniqueness
// and compatibility with Go's release tagging convention (projectRoot/vx.x.x).
// This removes potential name conflicts between packages at different locations.

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
