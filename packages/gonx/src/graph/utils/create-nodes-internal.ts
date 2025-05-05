import { CreateNodesContextV2, ProjectConfiguration } from '@nx/devkit';
import { dirname, basename } from 'path';
import { GoPluginOptions } from '../types/go-plugin-options';
import { hasMainPackage } from './has-main-package';
import { getTargetsByProjectType } from './targets/get-targets-by-project-type';

export function createNodesInternal(
  configFilePath: string,
  options: GoPluginOptions,
  // context is not used, but TypeScript needs the parameter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: CreateNodesContextV2
) {
  // Get the full project root directory
  const projectRoot = dirname(configFilePath);

  // Get a more readable name from the directory
  const projectName = basename(projectRoot);

  // Detect if this is an application or a library
  const isApplication = hasMainPackage(projectRoot);
  const projectType = isApplication ? 'application' : 'library';

  const targets = getTargetsByProjectType(projectRoot, options);

  // Create the project configuration
  const projectConfig: ProjectConfiguration & { root: string } = {
    name: projectName,
    root: projectRoot,
    sourceRoot: projectRoot,
    projectType,
    targets,
    tags: options.tagName ? [options.tagName] : [],
    // Add release configuration for nx release
    release: {
      version: {
        versionActions: '@naxodev/gonx/src/release/go-version-actions',
      },
    },
  };

  return {
    projects: {
      [projectRoot]: projectConfig,
    },
  };
}
