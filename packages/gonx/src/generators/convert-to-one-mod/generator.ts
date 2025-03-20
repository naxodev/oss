import { formatFiles, logger, Tree } from '@nx/devkit';
import { GO_WORK_FILE } from '../../constants';
import {
  createGoMod,
  ensureGoConfigInSharedGlobals,
  getProjectScope,
} from '../../utils';
import { ConvertToOneModGeneratorSchema } from './schema';

export default async function convertToOneModGenerator(
  tree: Tree,
  options: ConvertToOneModGeneratorSchema
) {
  if (!tree.exists(GO_WORK_FILE)) {
    logger.error('Go workspace file (go.work) not found. Nothing to convert.');
    return;
  }
  const workContent = tree.read(GO_WORK_FILE).toString();
  if (/^use /m.test(workContent)) {
    logger.error(
      'Go workspace already includes local modules (use directive) and cannot be automatically converted to a single module setup.'
    );
    return;
  }

  tree.delete(GO_WORK_FILE);
  createGoMod(tree, getProjectScope(tree));
  ensureGoConfigInSharedGlobals(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}
