import type { Tree } from '@nx/devkit';
import * as nxDevkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import * as shared from '../../utils';
import initGenerator from './generator';
import { InitGeneratorSchema } from './schema';

jest.mock('@nx/devkit', () => ({
  formatFiles: jest.fn(),
  logger: { warn: jest.fn() },
}));
jest.mock('../../utils', () => ({
  addNxPlugin: jest.fn(),
  createGoWork: jest.fn(),
  ensureGoConfigInSharedGlobals: jest.fn(),
  getProjectScope: jest.fn().mockReturnValue('proj'),
  supportsGoWorkspace: jest.fn().mockReturnValue(true),
}));

describe('init generator', () => {
  let tree: Tree;
  const options: InitGeneratorSchema = {};

  beforeEach(() => (tree = createTreeWithEmptyWorkspace()));
  afterEach(() => jest.clearAllMocks());

  it('should add Nx plugin', async () => {
    await initGenerator(tree, options);
    expect(shared.addNxPlugin).toHaveBeenCalledWith(tree);
  });

  it('should create go workspace if supported and flag is set', async () => {
    jest.spyOn(shared, 'supportsGoWorkspace').mockReturnValueOnce(true);
    await initGenerator(tree, { ...options, addGoDotWork: true });
    expect(shared.createGoWork).toHaveBeenCalledWith(tree);
  });

  it('should not create go workspace if flag is not set', async () => {
    jest.spyOn(shared, 'supportsGoWorkspace').mockReturnValueOnce(true);
    await initGenerator(tree, options);
    expect(shared.createGoWork).not.toHaveBeenCalled();
  });

  it('should ensure go configuration in shared globals when go.work is enabled', async () => {
    await initGenerator(tree, { ...options, addGoDotWork: true });
    expect(shared.ensureGoConfigInSharedGlobals).toHaveBeenCalledWith(tree);
  });

  it('should not ensure go configuration in shared globals when go.work is disabled', async () => {
    await initGenerator(tree, options);
    expect(shared.ensureGoConfigInSharedGlobals).not.toHaveBeenCalled();
  });

  it('should not create go workspace when flag is not set even if workspace supports it', async () => {
    jest.spyOn(shared, 'supportsGoWorkspace').mockReturnValueOnce(true);
    await initGenerator(tree, { ...options, addGoDotWork: false });
    expect(shared.createGoWork).not.toHaveBeenCalled();
    expect(shared.ensureGoConfigInSharedGlobals).not.toHaveBeenCalled();
  });

  it('should not create go workspace when workspace does not support it even if flag is set', async () => {
    jest.spyOn(shared, 'supportsGoWorkspace').mockReturnValueOnce(false);
    await initGenerator(tree, { ...options, addGoDotWork: true });
    expect(shared.createGoWork).not.toHaveBeenCalled();
    expect(shared.ensureGoConfigInSharedGlobals).toHaveBeenCalledWith(tree);
  });

  it('should format files', async () => {
    await initGenerator(tree, options);
    expect(nxDevkit.formatFiles).toHaveBeenCalledWith(tree);
  });

  it('should not format files if skipped', async () => {
    await initGenerator(tree, { ...options, skipFormat: true });
    expect(nxDevkit.formatFiles).not.toHaveBeenCalled();
  });
});
