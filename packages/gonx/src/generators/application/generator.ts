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

  const template = options.template || 'standard';
  const templatePath = join(__dirname, 'files', template);

  generateFiles(tree, templatePath, options.projectRoot, options);

  var templateHasModFile = tree.exists(join(options.projectRoot, 'go.mod'));
  if (!templateHasModFile) {
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
