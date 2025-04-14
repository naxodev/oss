import { FileData } from '@nx/devkit';
import { GoModule } from '../types/go-module';
import { GoImportWithModule } from '../types/go-import-with-module';
import { readFileSync } from 'fs';
import { parseGoList } from './parse-go-list';

/**
 * Gets a list of go imports with associated module in the file.
 *
 * @param fileData file object computed by Nx
 * @param modules list of go modules
 */
export const getFileModuleImports = (
  fileData: FileData,
  modules: GoModule[]
): GoImportWithModule[] => {
  const content = readFileSync(fileData.file, 'utf-8')?.toString();
  if (content == null) {
    return [];
  }
  return parseGoList('import', content)
    .map((item) => (item.includes('"') ? item.split('"')[1] : item))
    .filter((item) => item != null)
    .map((item) => ({
      import: item,
      module: modules.find((mod) => item.startsWith(mod.Path)),
    }))
    .filter((item) => item.module);
};
