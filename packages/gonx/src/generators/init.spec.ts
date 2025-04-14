import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readNxJson } from '@nx/devkit';

import { initGenerator } from './init';
import { InitGeneratorSchema } from './schema';

describe('init generator', () => {
  let tree: Tree;
  const options: InitGeneratorSchema = {};

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await initGenerator(tree, options);

    // Check if nx.json was updated with the plugin
    const nxJson = readNxJson(tree);
    expect(nxJson).toBeDefined();
    expect(nxJson.plugins).toBeDefined();

    // Check if our plugin is in the plugins list
    const gonxPlugin = nxJson.plugins.find(
      (p) => typeof p === 'object' && p.plugin === '@naxodev/gonx'
    );
    expect(gonxPlugin).toBeDefined();

    // Check if go.work file was created
    expect(tree.exists('go.work')).toBeTruthy();
  });
});
