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

  generateFiles(tree, join(__dirname, 'files'), options.projectRoot, options);

  // Always create go.mod for the project
  createGoMod(tree, options.projectRoot, options.projectRoot);

  // Only add to go.work if it exists
  if (isGoWorkspace(tree)) {
    addGoWorkDependency(tree, options.projectRoot);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}
