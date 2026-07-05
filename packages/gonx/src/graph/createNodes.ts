import { CreateNodes, CreateNodesV2, createNodesFromFiles } from '@nx/devkit';
import { GoPluginOptions } from './types/go-plugin-options';
import { createNodesInternal } from './utils/create-nodes-internal';

// NOTE: We use the full project path as the project name to ensure uniqueness
// and compatibility with Go's release tagging convention (projectRoot/vx.x.x).
// This removes potential name conflicts between packages at different locations.

// File glob to find all Go projects
const goModGlob = '**/go.mod';

// Entry function that Nx calls to modify the graph. In Nx 23 `CreateNodes`
// itself carries the files-array signature (the former v2 shape) and plugin
// loaders prefer the `createNodes` field, so this is the primary export.
export const createNodes: CreateNodes<GoPluginOptions> = [
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

/**
 * @deprecated `CreateNodesV2` is Nx 23's back-compat alias of {@link CreateNodes};
 * this export exists only for plugin loaders that still look up the
 * `createNodesV2` field. Prefer {@link createNodes}.
 */
export const createNodesV2: CreateNodesV2<GoPluginOptions> = createNodes;
