import {
  describe,
  it,
  expect,
  mock,
  spyOn,
  beforeEach,
  afterEach,
} from 'bun:test';
import type { NxJsonConfiguration, Tree } from '@nx/devkit';
import * as nxDevkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { GO_MOD_FILE, GO_WORK_FILE, NX_PLUGIN_NAME } from '../constants';
import { GO_SOURCE_FILE_PATTERNS } from '../graph/utils/get-targets-by-project-type';
import * as goBridge from './go-bridge';
import {
  addNxPlugin,
  ensureGoConfigInSharedGlobals,
  ensureGoSourceNamedInput,
  isProjectUsingNxGo,
} from './nx-bridge';

mock.module('@nx/devkit', () => ({
  readNxJson: mock(),
  updateNxJson: mock(),
}));
mock.module('./go-bridge', () => ({
  isGoWorkspace: mock().mockReturnValue(false),
}));

describe('Nx bridge', () => {
  let tree: Tree;

  beforeEach(() => (tree = createTreeWithEmptyWorkspace()));
  afterEach(() => {
    (nxDevkit.readNxJson as ReturnType<typeof mock>).mockReset();
    (nxDevkit.updateNxJson as ReturnType<typeof mock>).mockReset();
    (goBridge.isGoWorkspace as ReturnType<typeof mock>).mockReset();
    (goBridge.isGoWorkspace as ReturnType<typeof mock>).mockReturnValue(false);
  });

  describe('Method: addNxPlugin', () => {
    it('should add the plugin to the plugins array if not already included', () => {
      const nxJson = { plugins: [] } as NxJsonConfiguration;
      const spyUpdateNxJson = spyOn(nxDevkit, 'updateNxJson');
      spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
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
      const spyUpdateNxJson = spyOn(nxDevkit, 'updateNxJson');
      spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
      addNxPlugin(tree);
      expect(nxJson.plugins).toEqual([pluginConfig]);
      expect(spyUpdateNxJson).not.toHaveBeenCalled();
    });
  });

  describe('Method: ensureGoConfigInSharedGlobals', () => {
    it.each([
      {
        sharedGlobals: [],
        isGoWorkspace: false,
        updated: false,
        expectedSharedGlobals: [],
        description: 'workspace is not using go.work',
      },
      {
        sharedGlobals: [`{workspaceRoot}/${GO_MOD_FILE}`],
        isGoWorkspace: false,
        updated: false,
        expectedSharedGlobals: [`{workspaceRoot}/${GO_MOD_FILE}`],
        description: 'workspace is not using go.work but has go.mod',
      },
      {
        sharedGlobals: [],
        isGoWorkspace: true,
        updated: true,
        expectedSharedGlobals: [`{workspaceRoot}/${GO_WORK_FILE}`],
        description: 'workspace is using go.work and no shared globals exist',
      },
      {
        sharedGlobals: [`{workspaceRoot}/${GO_WORK_FILE}`],
        isGoWorkspace: true,
        updated: false,
        expectedSharedGlobals: [`{workspaceRoot}/${GO_WORK_FILE}`],
        description:
          'workspace is using go.work and go.work already in shared globals',
      },
      {
        sharedGlobals: [`{workspaceRoot}/${GO_MOD_FILE}`],
        isGoWorkspace: true,
        updated: true,
        expectedSharedGlobals: [
          `{workspaceRoot}/${GO_MOD_FILE}`,
          `{workspaceRoot}/${GO_WORK_FILE}`,
        ],
        description:
          'workspace is using go.work but only has go.mod in shared globals',
      },
    ])(
      'should modify sharedGlobals if %p',
      ({ sharedGlobals, isGoWorkspace, updated, expectedSharedGlobals }) => {
        const nxJson = {
          namedInputs: { sharedGlobals },
        } as unknown as NxJsonConfiguration;
        const spyUpdateNxJson = spyOn(nxDevkit, 'updateNxJson');
        spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
        spyOn(goBridge, 'isGoWorkspace').mockReturnValue(isGoWorkspace);
        ensureGoConfigInSharedGlobals(tree);
        expect(nxJson.namedInputs.sharedGlobals).toEqual([
          ...expectedSharedGlobals,
        ]);
        expect(spyUpdateNxJson).toHaveBeenCalledTimes(updated ? 1 : 0);
      }
    );
  });

  describe('Method: ensureGoSourceNamedInput', () => {
    it('should add the goSource named input when it is missing', () => {
      const nxJson = { namedInputs: {} } as NxJsonConfiguration;
      const spyUpdateNxJson = spyOn(nxDevkit, 'updateNxJson');
      spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
      ensureGoSourceNamedInput(tree);
      expect(spyUpdateNxJson).toHaveBeenCalledTimes(1);
      expect(spyUpdateNxJson).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          namedInputs: expect.objectContaining({
            goSource: GO_SOURCE_FILE_PATTERNS,
          }),
        })
      );
    });

    it('should add the goSource named input when namedInputs is entirely undefined', () => {
      const nxJson = {} as NxJsonConfiguration;
      const spyUpdateNxJson = spyOn(nxDevkit, 'updateNxJson');
      spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
      ensureGoSourceNamedInput(tree);
      expect(spyUpdateNxJson).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          namedInputs: { goSource: GO_SOURCE_FILE_PATTERNS },
        })
      );
    });

    it('should not overwrite an existing user-defined goSource named input', () => {
      const customGoSource = ['{projectRoot}/**/*.go'];
      const nxJson = {
        namedInputs: { goSource: customGoSource },
      } as unknown as NxJsonConfiguration;
      const spyUpdateNxJson = spyOn(nxDevkit, 'updateNxJson');
      spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
      ensureGoSourceNamedInput(tree);
      expect(spyUpdateNxJson).not.toHaveBeenCalled();
      expect(nxJson.namedInputs.goSource).toEqual(customGoSource);
    });

    it('should preserve other named inputs already defined in nx.json', () => {
      const nxJson = {
        namedInputs: { sharedGlobals: [`{workspaceRoot}/${GO_WORK_FILE}`] },
      } as unknown as NxJsonConfiguration;
      const spyUpdateNxJson = spyOn(nxDevkit, 'updateNxJson');
      spyOn(nxDevkit, 'readNxJson').mockReturnValue(nxJson);
      ensureGoSourceNamedInput(tree);
      expect(spyUpdateNxJson).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          namedInputs: {
            sharedGlobals: [`{workspaceRoot}/${GO_WORK_FILE}`],
            goSource: GO_SOURCE_FILE_PATTERNS,
          },
        })
      );
    });
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
