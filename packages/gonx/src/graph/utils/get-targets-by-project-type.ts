import { TargetConfiguration } from '@nx/devkit';
import { GoPluginOptions } from '../types/go-plugin-options';

/**
 * Cache-relevant inputs shared by every target whose output depends on the
 * Go module's source (build, lint, tidy, test, generate). Kept as a single
 * constant so these targets can't drift out of sync with each other and
 * silently change cache hashes.
 */
const GO_SOURCE_INPUTS = [
  '{projectRoot}/go.mod',
  '{projectRoot}/go.sum',
  '{projectRoot}/**/*.{go}',
];

function buildTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:build',
    cache: true,
    dependsOn: ['generate'],
    inputs: GO_SOURCE_INPUTS,
    options: {
      outputPath: 'dist/{projectRoot}/',
    },
    outputs: ['{options.outputPath}'],
  };
}

function serveTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:serve',
    continuous: true,
    options: {},
  };
}

function lintTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:lint',
    cache: true,
    inputs: GO_SOURCE_INPUTS,
  };
}

function tidyTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:tidy',
    cache: true,
    inputs: GO_SOURCE_INPUTS,
  };
}

function testTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:test',
    cache: true,
    dependsOn: ['generate', '^build'],
    inputs: GO_SOURCE_INPUTS,
  };
}

function generateTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:generate',
    cache: true,
    dependsOn: ['^generate'],
    inputs: GO_SOURCE_INPUTS,
  };
}

/**
 * Creates a release-publish target configuration for a Go project
 * @param projectRoot The root path of the project
 * @returns The target configuration for releasing and publishing the Go module
 */
function releasePublishTarget(projectRoot: string): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:release-publish',
    options: {
      moduleRoot: projectRoot,
    },
    configurations: {
      development: {
        dryRun: true,
      },
    },
  };
}

/**
 * Builds the target table for a Go project.
 *
 * @param projectRoot The root path of the project
 * @param options The plugin options, used to resolve custom target names
 * @param isApplication Whether the project is an application (has a main
 * package) or a library. Callers must detect this themselves (see
 * `hasMainPackage`) and pass it in, rather than this function re-detecting
 * it, since detection does filesystem I/O and must run exactly once per
 * project.
 */
export function getTargetsByProjectType(
  projectRoot: string,
  options: GoPluginOptions,
  isApplication: boolean
): Record<string, TargetConfiguration> {
  // For better UX, set default target names if not provided
  const buildTargetName = options.buildTargetName || 'build';
  const testTargetName = options.testTargetName || 'test';
  const serveTargetName = options.runTargetName || 'serve';
  const tidyTargetName = options.tidyTargetName || 'tidy';
  const lintTargetName = options.lintTargetName || 'lint';
  const generateTargetName = options.generateTargetName || 'generate';
  const releasePublishTargetName =
    options.releasePublishTargetName || 'nx-release-publish';

  // Initialize targets object
  const targets: Record<string, TargetConfiguration> = {};

  // Common targets - available for both apps and libraries
  targets[generateTargetName] = generateTarget();
  targets[testTargetName] = testTarget();
  targets[tidyTargetName] = tidyTarget();
  targets[lintTargetName] = lintTarget();
  targets[releasePublishTargetName] = releasePublishTarget(projectRoot);

  // Build and run targets - only for applications
  if (isApplication) {
    targets[buildTargetName] = buildTarget();

    targets[serveTargetName] = serveTarget();
  }

  return targets;
}
