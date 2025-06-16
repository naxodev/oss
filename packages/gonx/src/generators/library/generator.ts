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

  if (isGoWorkspace(tree)) {
    createGoMod(tree, options.projectRoot, options.projectRoot);
    addGoWorkDependency(tree, options.projectRoot);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}
