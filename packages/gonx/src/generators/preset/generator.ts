import type { Tree } from '@nx/devkit';
import type { PresetGeneratorSchema } from './schema';
import libraryGenerator from '../library/generator';
import applicationGenerator from '../application/generator';

export default async function presetGenerator(
  tree: Tree,
  options: PresetGeneratorSchema
) {
  if (options.type === 'library') {
    return libraryGenerator(tree, options);
  }

  return applicationGenerator(tree, options);
}
