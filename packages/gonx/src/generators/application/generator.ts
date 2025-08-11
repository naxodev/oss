import { formatFiles, generateFiles, Tree } from '@nx/devkit';
import { join } from 'path';
import {
  addGoWorkDependency,
  createGoMod,
  isGoWorkspace,
  normalizeOptions,
} from '../../utils';
import type { ApplicationGeneratorSchema } from './schema';
import initGenerator from '../init/generator';

export default async function applicationGenerator(
  tree: Tree,
  schema: ApplicationGeneratorSchema
) {
  const options = await normalizeOptions(tree, schema, 'application');

  await initGenerator(tree, {
    skipFormat: true,
    addGoDotWork: options.addGoDotWork,
  });

  // Determine the template directory based on the variant
  const appVariant = options.variant || 'standard';
  const templatePath = join(__dirname, 'files', appVariant);

  generateFiles(tree, templatePath, options.projectRoot, options);

  // Create go.mod - if there's a custom template, it will be used, otherwise use the default
  if (tree.exists(join(options.projectRoot, 'go.mod'))) {
    // go.mod was created from template, no need to create it again
  } else {
    // Fallback to creating a basic go.mod
    createGoMod(tree, options.projectRoot, options.projectRoot);
  }

  // Only add to go.work if it exists
  if (isGoWorkspace(tree)) {
    addGoWorkDependency(tree, options.projectRoot);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}
