import type { NxJsonConfiguration, Tree } from '@nx/devkit';
import * as nxDevkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { GO_MOD_FILE, GO_WORK_FILE, NX_PLUGIN_NAME } from '../constants';
import * as goBridge from './go-bridge';
import {
  addNxPlugin,
  ensureGoConfigInSharedGlobals,
  isProjectUsingNxGo,
} from './nx-bridge';

jest.mock('@nx/devkit');
jest.mock('./go-bridge', () => ({
  isGoWorkspace: jest.fn().mockReturnValue(false),
}));

describe('Nx bridge', () => {
  let tree: Tree;

  beforeEach(() => (tree = createTreeWithEmptyWorkspace()));
  afterEach(() => jest.resetAllMocks());

  describe('Method: addNxPlugin', () => {
    it('should add the plugin to the plugins array if not already included', () => {
      const nxJson = { plugins: [] } as NxJsonConfiguration;
      const spyUpdateNxJson = jest.spyOn(nxDevkit, 'updateNxJson');
      jest.spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
      addNxPlugin(tree);
      // Check for an object with the plugin property equal to NX_PLUGIN_NAME
      expect(nxJson.plugins).toContainEqual(
        expect.objectContaining({ plugin: NX_PLUGIN_NAME })
      );
      expect(spyUpdateNxJson).toHaveBeenCalledTimes(1);
    });

    it('should not add the plugin to the plugins array if already included', () => {
      const pluginConfig = {
        plugin: '@naxodev/gonx',
        options: {
          buildTargetName: 'build',
          serveTargetName: 'serve',
          testTargetName: 'test',
          lintTargetName: 'lint',
          tidyTargetName: 'tidy',
        },
      };
      const nxJson = { plugins: [pluginConfig] } as NxJsonConfiguration;
      const spyUpdateNxJson = jest.spyOn(nxDevkit, 'updateNxJson');
      jest.spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
      addNxPlugin(tree);
      expect(nxJson.plugins).toEqual([pluginConfig]);
      expect(spyUpdateNxJson).not.toHaveBeenCalled();
    });
  });

  describe('Method: ensureGoConfigInSharedGlobals', () => {
    it.each`
      sharedGlobals                          | isGoWorkspace | updated  | expectedSharedGlobals                                                    | description
      ${[]}                                  | ${false}      | ${false} | ${[]}                                                                    | ${'workspace is not using go.work'}
      ${[`{workspaceRoot}/${GO_MOD_FILE}`]}  | ${false}      | ${false} | ${[`{workspaceRoot}/${GO_MOD_FILE}`]}                                    | ${'workspace is not using go.work but has go.mod'}
      ${[]}                                  | ${true}       | ${true}  | ${[`{workspaceRoot}/${GO_WORK_FILE}`]}                                   | ${'workspace is using go.work and no shared globals exist'}
      ${[`{workspaceRoot}/${GO_WORK_FILE}`]} | ${true}       | ${false} | ${[`{workspaceRoot}/${GO_WORK_FILE}`]}                                   | ${'workspace is using go.work and go.work already in shared globals'}
      ${[`{workspaceRoot}/${GO_MOD_FILE}`]}  | ${true}       | ${true}  | ${[`{workspaceRoot}/${GO_MOD_FILE}`, `{workspaceRoot}/${GO_WORK_FILE}`]} | ${'workspace is using go.work but only has go.mod in shared globals'}
    `(
      'should modify sharedGlobals if $description',
      ({ sharedGlobals, isGoWorkspace, updated, expectedSharedGlobals }) => {
        const nxJson = {
          namedInputs: { sharedGlobals },
        } as NxJsonConfiguration;
        const spyUpdateNxJson = jest.spyOn(nxDevkit, 'updateNxJson');
        jest.spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
        jest.spyOn(goBridge, 'isGoWorkspace').mockReturnValue(isGoWorkspace);
        ensureGoConfigInSharedGlobals(tree);
        expect(nxJson.namedInputs.sharedGlobals).toEqual(expectedSharedGlobals);
        expect(spyUpdateNxJson).toHaveBeenCalledTimes(updated ? 1 : 0);
      }
    );
  });

  describe('Method: isProjectUsingNxGo', () => {
    it('should return false when the project is using naxodev', () => {
      expect(isProjectUsingNxGo({ root: '', targets: {} })).toBeFalsy();
    });

    it('should return true when the project is using naxodev', () => {
      expect(
        isProjectUsingNxGo({
          root: '',
          targets: {
            serve: { executor: `${NX_PLUGIN_NAME}:serve` },
          },
        })
      ).toBeTruthy();
    });
  });
});
