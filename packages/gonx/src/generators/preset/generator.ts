import type { Tree } from '@nx/devkit';
import type { PresetGeneratorSchema } from './schema';
import libraryGenerator from '../library/generator';
import applicationGenerator from '../application/generator';
import goBlueprintGenerator from '../go-blueprint/go-blueprint';
import type { GoBlueprintGeneratorSchema } from '../go-blueprint/schema';

export default async function presetGenerator(
  tree: Tree,
  options: PresetGeneratorSchema
) {
  if (options.type === 'library') {
    return libraryGenerator(tree, options);
  }

  if (options.type === 'go-blueprint') {
    // Ensure required go-blueprint options have defaults
    const goBlueprintOptions: GoBlueprintGeneratorSchema = {
      ...options,
      driver: options.driver || 'none',
      framework: options.framework || 'gin',
      git: options.git || 'skip',
      feature: options.feature || [],
    };
    return goBlueprintGenerator(tree, goBlueprintOptions);
  }

  return applicationGenerator(tree, options);
}
