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

  if (isGoWorkspace(tree)) {
    createGoMod(tree, options.projectRoot, options.projectRoot);
    addGoWorkDependency(tree, options.projectRoot);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}
