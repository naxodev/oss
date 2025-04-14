import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';

import { applicationGenerator } from './generator';
import { ApplicationGeneratorSchema } from './schema';

describe('application generator', () => {
  let tree: Tree;
  const options: ApplicationGeneratorSchema = {
    name: 'go-app',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await applicationGenerator(tree, options);
    expect(tree.exists('go-app/cmd/go-app/main.go')).toBeTruthy();
  });
});
