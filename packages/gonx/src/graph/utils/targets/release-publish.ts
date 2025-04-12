import { TargetConfiguration } from '@nx/devkit';

/**
 * Creates a release-publish target configuration for a Go project
 * @param projectRoot The root path of the project
 * @returns The target configuration for releasing and publishing the Go module
 */
export function releasePublish(projectRoot: string): TargetConfiguration {
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
