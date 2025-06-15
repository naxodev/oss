import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import applicationGenerator from '../application/generator';
import libraryGenerator from '../library/generator';
import presetGenerator from './generator';
import type { PresetGeneratorSchema } from './schema';

jest.mock('../application/generator');
jest.mock('../library/generator');

describe('preset generator', () => {
  let tree: Tree;
  const baseOptions: PresetGeneratorSchema = {
    directory: 'test-dir',
    name: 'test-project',
  };

  beforeEach(() => (tree = createTreeWithEmptyWorkspace()));
  afterEach(() => jest.clearAllMocks());

  it('should run application generator by default', async () => {
    await presetGenerator(tree, baseOptions);
    expect(applicationGenerator).toHaveBeenCalledWith(tree, baseOptions);
    expect(libraryGenerator).not.toHaveBeenCalled();
  });

  it('should run library generator when type is library', async () => {
    const options = { ...baseOptions, type: 'library' as const };
    await presetGenerator(tree, options);
    expect(libraryGenerator).toHaveBeenCalledWith(tree, options);
    expect(applicationGenerator).not.toHaveBeenCalled();
  });

  it('should run application generator when type is binary', async () => {
    const options = { ...baseOptions, type: 'binary' as const };
    await presetGenerator(tree, options);
    expect(applicationGenerator).toHaveBeenCalledWith(tree, options);
    expect(libraryGenerator).not.toHaveBeenCalled();
  });

  it('should handle additional options and pass them through', async () => {
    const options = {
      ...baseOptions,
      type: 'library' as const,
      skipFormat: true,
      addGoDotWork: true,
      tags: 'test,lib',
    };
    await presetGenerator(tree, options);
    expect(libraryGenerator).toHaveBeenCalledWith(tree, options);
    expect(applicationGenerator).not.toHaveBeenCalled();
  });

  it('should handle undefined type as default application', async () => {
    const options = { ...baseOptions, type: undefined };
    await presetGenerator(tree, options);
    expect(applicationGenerator).toHaveBeenCalledWith(tree, options);
    expect(libraryGenerator).not.toHaveBeenCalled();
  });
});
