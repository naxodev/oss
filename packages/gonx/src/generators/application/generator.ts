import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  Tree,
  ProjectConfiguration,
  joinPathFragments,
} from '@nx/devkit';
import * as path from 'path';
import { ApplicationGeneratorSchema } from './schema';
import { getProjectTagsFromSchema } from '../../utils/get-project-tag-from-schema';
import { getProjectRootFromSchema } from '../../utils/get-project-root-from-schema';

interface NormalizedSchema extends ApplicationGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  tree: Tree,
  options: ApplicationGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;

  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = getProjectRootFromSchema(
    tree,
    projectDirectory,
    'application'
  );
  const parsedTags = getProjectTagsFromSchema(options);

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };

  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

export async function applicationGenerator(
  tree: Tree,
  options: ApplicationGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

  // Create go.mod file
  const goModPath = joinPathFragments(normalizedOptions.projectRoot, 'go.mod');
  const appName = normalizedOptions.projectName.replace(/-/g, '');
  const goModContent = `module ${appName}\n\ngo 1.24\n`;

  // Create project files
  addFiles(tree, normalizedOptions);

  // Create go.mod file
  tree.write(goModPath, goModContent);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default applicationGenerator;
