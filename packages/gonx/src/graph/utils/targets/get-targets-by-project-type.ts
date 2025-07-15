import { TargetConfiguration } from '@nx/devkit';
import { test } from './test-target';
import { tidy } from './tidy';
import { lint } from './lint';
import { build } from './build';
import { serve } from './serve';
import { generate } from './generate';
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
  const generateTargetName = options.generateTargetName || 'generate';
  const releasePublishTargetName =
    options.releasePublishTargetName || 'nx-release-publish';

  // Initialize targets object
  const targets: Record<string, TargetConfiguration> = {};

  // Common targets - available for both apps and libraries
  targets[generateTargetName] = generate();
  targets[testTargetName] = test();
  targets[tidyTargetName] = tidy();
  targets[lintTargetName] = lint();
  targets[releasePublishTargetName] = releasePublish(projectRoot);

  // Build and run targets - only for applications
  if (isApplication) {
    targets[buildTargetName] = build();

    targets[serveTargetName] = serve();
  }

  return targets;
}
