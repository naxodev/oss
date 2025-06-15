import {
  type ProjectConfiguration,
  readNxJson,
  type TargetConfiguration,
  type Tree,
  updateNxJson,
} from '@nx/devkit';
import { GO_WORK_FILE, NX_PLUGIN_NAME } from '../constants';
import { isGoWorkspace } from './go-bridge';

/**
 * Adds the gonx plugin to the nx.json if it's not already there.
 *
 * @param tree project tree object
 */
export const addNxPlugin = (tree: Tree): void => {
  const nxJson = readNxJson(tree);
  const hasPlugin = nxJson.plugins?.some(
    (plugin) => typeof plugin === 'object' && plugin.plugin === NX_PLUGIN_NAME
  );

  if (!hasPlugin) {
    nxJson.plugins = [
      ...(nxJson.plugins || []),
      {
        plugin: '@naxodev/gonx',
        options: {
          buildTargetName: 'build',
          serveTargetName: 'serve',
          testTargetName: 'test',
          lintTargetName: 'lint',
          tidyTargetName: 'tidy',
        },
      },
    ];
    updateNxJson(tree, nxJson);
  }
};

/**
 * Ensures that go configuration files are included as a sharedGlobal,
 * so any changes will trigger projects to be flagged as affected.
 *
 * @param tree project tree object
 */
export const ensureGoConfigInSharedGlobals = (tree: Tree): void => {
  const useWorkspace = isGoWorkspace(tree);
  const toAdd = `{workspaceRoot}/${GO_WORK_FILE}`;

  const nxJson = readNxJson(tree);
  const namedInputs = nxJson.namedInputs ?? {};
  const sharedGlobals = namedInputs['sharedGlobals'] ?? [];

  if (!sharedGlobals.includes(toAdd) && useWorkspace) {
    namedInputs.sharedGlobals = Array.from(new Set([...sharedGlobals, toAdd]));
    updateNxJson(tree, { ...nxJson, namedInputs });
  }
};

/**
 * Checks if a Nx project is using the naxodev plugin.
 *
 * @param project project configuration object
 */
export const isProjectUsingNxGo = (project: ProjectConfiguration): boolean =>
  Object.values(project.targets).some((target: TargetConfiguration) =>
    target.executor.includes(NX_PLUGIN_NAME)
  );
