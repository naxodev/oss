import { names, ProjectType, Tree } from '@nx/devkit';
import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';
import {
  bubbleTeaVersion,
  cobraVersion,
  goVersion,
  lipGlossVersion,
} from './versions';

export interface GeneratorSchema {
  directory: string;
  name?: string;
  template?: 'standard' | 'cli' | 'tui';
  tags?: string;
  skipFormat?: boolean;
  addGoDotWork?: boolean;
}

export interface GeneratorNormalizedSchema extends GeneratorSchema {
  moduleName: string;
  projectName: string;
  projectRoot: string;
  projectType: ProjectType;
  parsedTags: string[];
  goVersion: string;
  cobraVersion?: string;
  bubbleTeaVersion?: string;
  lipGlossVersion?: string;
}

export const normalizeOptions = async (
  tree: Tree,
  options: GeneratorSchema,
  projectType: ProjectType
): Promise<GeneratorNormalizedSchema> => {
  const { projectName, projectRoot } = await determineProjectNameAndRootOptions(
    tree,
    {
      name: options.name,
      projectType: projectType,
      directory: options.directory,
    }
  );

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const defaultOptions = {
    ...options,
    name: projectName,
    moduleName: names(projectName).propertyName.toLowerCase(),
    projectName,
    projectRoot,
    projectType,
    parsedTags,
    goVersion,
  };

  if (options.template === 'cli') {
    return {
      ...defaultOptions,
      cobraVersion,
    };
  }

  if (options.template === 'tui') {
    return {
      ...defaultOptions,
      bubbleTeaVersion,
      lipGlossVersion,
    };
  }

  return defaultOptions;
};
