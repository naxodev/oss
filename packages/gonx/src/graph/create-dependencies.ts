import { CreateDependencies } from '@nx/devkit';
import { createStaticAnalysisDependencies } from './static-analysis';
import { GoPluginOptions } from './types/go-plugin-options';

export const createDependencies: CreateDependencies<GoPluginOptions> = async (
  options,
  context
) => {
  if (options?.skipGoDependencyCheck) {
    return [];
  }

  return createStaticAnalysisDependencies(options, context);
};
