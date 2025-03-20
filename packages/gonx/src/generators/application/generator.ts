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
import { ApplicationGeneratorSchema } from './schema';

interface NormalizedSchema extends ApplicationGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(tree: Tree, options: ApplicationGeneratorSchema): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`;
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

export async function applicationGenerator(tree: Tree, options: ApplicationGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  
  // Create go.mod file
  const goModPath = joinPathFragments(normalizedOptions.projectRoot, 'go.mod');
  const appName = normalizedOptions.projectName.replace(/-/g, '');
  const goModContent = `module ${appName}\n\ngo 1.22\n`;
  
  // Create project files
  addFiles(tree, normalizedOptions);
  
  // Create go.mod file
  tree.write(goModPath, goModContent);
  
  // Add project configuration
  const projectConfig: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.projectRoot}/cmd/${normalizedOptions.name}`,
    targets: {
      build: {
        executor: '@naxodev/gonx:build',
        options: {
          main: `./cmd/${normalizedOptions.name}/main.go`
        }
      },
      serve: {
        executor: '@naxodev/gonx:serve',
        options: {
          main: `./cmd/${normalizedOptions.name}/main.go`
        }
      },
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

export default applicationGenerator;
