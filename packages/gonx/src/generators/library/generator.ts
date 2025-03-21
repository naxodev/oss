import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  Tree,
  getWorkspaceLayout,
  ProjectConfiguration,
  joinPathFragments
} from '@nx/devkit';
import * as path from 'path';
import { LibraryGeneratorSchema } from './schema';

interface NormalizedSchema extends LibraryGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(tree: Tree, options: LibraryGeneratorSchema): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

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

export async function libraryGenerator(tree: Tree, options: LibraryGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  
  // Create go.mod file
  const goModPath = joinPathFragments(normalizedOptions.projectRoot, 'go.mod');
  const libName = normalizedOptions.projectName.replace(/-/g, '');
  const goModContent = `module ${libName}\n\ngo 1.24\n`;
  
  // Create project files
  addFiles(tree, normalizedOptions);
  
  // Create go.mod file
  tree.write(goModPath, goModContent);
  
  // Add project configuration
  const projectConfig: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/pkg`,
    targets: {
      test: {
        executor: '@naxodev/gonx:test'
      },
      lint: {
        executor: '@naxodev/gonx:lint'
      },
      tidy: {
        executor: '@naxodev/gonx:tidy'
      }
    },
    tags: normalizedOptions.parsedTags
  };
  
  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfig
  );
  
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default libraryGenerator;
