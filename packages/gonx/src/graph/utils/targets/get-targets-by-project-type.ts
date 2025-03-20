import { TargetConfiguration } from '@nx/devkit';
import { test } from './test-target';
import { tidy } from './tidy';
import { lint } from './lint';
import { build } from './build';
import { serve } from './serve';
import { releasePublish } from './release-publish';
import { GoPluginOptions } from '../../types/go-plugin-options';
import { hasMainPackage } from '../has-main-package';

export function getTargetsByProjectType(
  projectRoot: string,
  options: GoPluginOptions
) {
  // Detect if this is an application or a library
  const isApplication = hasMainPackage(projectRoot);
  // For better UX, set default target names if not provided
  const buildTargetName = options.buildTargetName || 'build';
  const testTargetName = options.testTargetName || 'test';
  const serveTargetName = options.runTargetName || 'serve';
  const tidyTargetName = options.tidyTargetName || 'tidy';
  const lintTargetName = options.lintTargetName || 'lint';
  const releasePublishTargetName =
    options.releasePublishTargetName || 'nx-release-publish';

  // Initialize targets object
  const targets: Record<string, TargetConfiguration> = {};

  // Common test target - available for both apps and libraries
  targets[testTargetName] = test();

  // Tidy target - available for both apps and libraries
  targets[tidyTargetName] = tidy();

  // Lint target - available for both apps and libraries
  targets[lintTargetName] = lint();

  // Release-publish target - available for both apps and libraries
  targets[releasePublishTargetName] = releasePublish(projectRoot);

  // Build and run targets - only for applications
  if (isApplication) {
    targets[buildTargetName] = build();

    targets[serveTargetName] = serve();
  }

  return targets;
}
