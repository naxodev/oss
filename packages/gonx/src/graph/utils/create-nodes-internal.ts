import { CreateNodesContext, ProjectConfiguration } from '@nx/devkit';
import { dirname } from 'path';
import { GoPluginOptions } from '../types/go-plugin-options';
import { hasMainPackage } from './has-main-package';
import {
  GO_SOURCE_FILE_PATTERNS,
  GO_SOURCE_NAMED_INPUT,
  getTargetsByProjectType,
} from './get-targets-by-project-type';

export function createNodesInternal(
  configFilePath: string,
  options: GoPluginOptions = {},
  // context is not used, but TypeScript needs the parameter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: CreateNodesContext
) {
  // Get the full project root directory
  const projectRoot = dirname(configFilePath);

  // Use the projectRoot as the name to ensure uniqueness
  // This also supports Go's release tagging convention (projectRoot/vx.x.x)
  const projectName = projectRoot;

  // Detect if this is an application or a library. Computed once here and
  // threaded through to getTargetsByProjectType, since hasMainPackage does
  // filesystem I/O and must only run once per project.
  const isApplication = hasMainPackage(projectRoot);
  const projectType = isApplication ? 'application' : 'library';

  const targets = getTargetsByProjectType(projectRoot, options, isApplication);

  // Create the project configuration
  const projectConfig: ProjectConfiguration & { root: string } = {
    name: projectName,
    root: projectRoot,
    sourceRoot: projectRoot,
    projectType,
    targets,
    // Targets reference the dependency source of other projects via the
    // `^goSource` named input (see get-targets-by-project-type.ts), which
    // Nx resolves against each dependency's own namedInputs. Every
    // gonx-inferred project must therefore define `goSource` itself, or
    // hashing a project that depends on it would fail. Nx merges
    // plugin-provided namedInputs into the final project config alongside
    // any project.json-defined ones.
    namedInputs: { [GO_SOURCE_NAMED_INPUT]: GO_SOURCE_FILE_PATTERNS },
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
