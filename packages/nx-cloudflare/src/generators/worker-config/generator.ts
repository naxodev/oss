import { formatFiles, Tree } from '@nx/devkit';
import type { Schema } from './schema';
import { applyProductionTogglesToProject } from '../../utils/wrangler-config';
import { resolveProjectRootOrThrow } from '../../utils/project';

export async function workerConfigGenerator(
  tree: Tree,
  schema: Schema
): Promise<void> {
  if (!schema.observability && !schema.smartPlacement) {
    throw new Error(
      `worker-config: nothing to do — pass --observability and/or --smartPlacement.`
    );
  }

  const projectRoot = await resolveProjectRootOrThrow(tree, schema.project);

  const applied = applyProductionTogglesToProject(
    tree,
    projectRoot,
    {
      observability: schema.observability,
      smartPlacement: schema.smartPlacement,
    },
    'worker-config'
  );
  if (!applied) {
    throw new Error(
      `No wrangler.{jsonc,json,toml} found in ${projectRoot}. ` +
        `worker-config targets an existing Worker project.`
    );
  }

  if (!schema.skipFormat) {
    await formatFiles(tree);
  }
}

export default workerConfigGenerator;
