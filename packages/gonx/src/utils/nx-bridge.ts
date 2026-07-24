import {
  type ProjectConfiguration,
  readNxJson,
  type TargetConfiguration,
  type Tree,
  updateNxJson,
} from '@nx/devkit';
import { GO_WORK_FILE, NX_PLUGIN_NAME } from '../constants';
import {
  GO_SOURCE_FILE_PATTERNS,
  GO_SOURCE_NAMED_INPUT,
} from '../graph/utils/get-targets-by-project-type';
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
 * Ensures the workspace's nx.json defines the `goSource` named input,
 * falling back to `GO_SOURCE_FILE_PATTERNS` when it's missing.
 *
 * Every gonx-inferred project already defines `goSource` in its own
 * `namedInputs` (see `createNodesInternal`), which is enough for the
 * `^goSource` inputs on build/test/lint/tidy to resolve for Go -> Go
 * dependencies. But Nx's hasher errors with "Input 'goSource' is not
 * defined" when `^goSource` is expanded for a dependency project that
 * doesn't define it itself -- which happens if a user adds an
 * `implicitDependencies` (or similar) edge from a Go project to a
 * non-Go project. This workspace-level fallback in nx.json covers that
 * case; for non-Go projects the patterns simply match nothing, so it's a
 * safe no-op default. A user-defined `goSource` is never overwritten.
 *
 * @param tree project tree object
 */
export const ensureGoSourceNamedInput = (tree: Tree): void => {
  const nxJson = readNxJson(tree);
  const namedInputs = nxJson.namedInputs ?? {};

  if (namedInputs[GO_SOURCE_NAMED_INPUT]) {
    return;
  }

  updateNxJson(tree, {
    ...nxJson,
    namedInputs: {
      ...namedInputs,
      [GO_SOURCE_NAMED_INPUT]: GO_SOURCE_FILE_PATTERNS,
    },
  });
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
