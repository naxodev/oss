import { formatFiles, generateFiles, names, Tree } from '@nx/devkit';
import { join } from 'path';
import {
  addGoWorkDependency,
  createGoMod,
  isGoWorkspace,
  normalizeOptions,
} from '../../utils';
import { LibraryGeneratorSchema } from './schema';
import initGenerator from '../init/generator';

export default async function libraryGenerator(
  tree: Tree,
  schema: LibraryGeneratorSchema
) {
  const options = await normalizeOptions(tree, schema, 'library');

  await initGenerator(tree, {
    skipFormat: true,
    addGoDotWork: options.addGoDotWork,
  });

  generateFiles(tree, join(__dirname, 'files'), options.projectRoot, {
    ...options,
    ...names(options.projectName),
  });

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
