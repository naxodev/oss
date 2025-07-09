import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { goBlueprintGenerator } from './go-blueprint';
import { GoBlueprintGeneratorSchema } from './schema';

describe('go-blueprint generator', () => {
  let tree: Tree;
  const options: GoBlueprintGeneratorSchema = { directory: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('temp test', async () => {
    expect(true).toBeTruthy();
  });
});
