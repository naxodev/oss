import { formatFiles, Tree } from '@nx/devkit';
import {
  addNxPlugin,
  createGoWork,
  ensureGoConfigInSharedGlobals,
  ensureGoSourceNamedInput,
  supportsGoWorkspace,
} from '../../utils';
import { InitGeneratorSchema } from './schema';

export async function initGenerator(tree: Tree, options: InitGeneratorSchema) {
  if (supportsGoWorkspace() && options.addGoDotWork) {
    createGoWork(tree);
  }

  addNxPlugin(tree);

  if (options.addGoDotWork) {
    ensureGoConfigInSharedGlobals(tree);
  }

  ensureGoSourceNamedInput(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default initGenerator;
