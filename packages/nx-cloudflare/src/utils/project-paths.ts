import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import { resolve } from 'path';

/**
 * Resolve the workspace-relative root of the project an executor is running
 * for, preferring the project configuration and falling back to the project
 * graph node.
 */
export function getProjectRoot(context: ExecutorContext): string {
  const root =
    context.projectsConfigurations?.projects?.[context.projectName]?.root ??
    context.projectGraph?.nodes?.[context.projectName]?.data?.root;

  if (!root) {
    throw new Error(
      `Unable to find the project root for ${context.projectName}. Is it set in the project configuration?`
    );
  }

  return root;
}

/**
 * Absolute working directory for a project's executor, used as the `cwd` for
 * the wrangler child process so both serve and deploy run from the same
 * resolved location.
 */
export function getProjectCwd(context: ExecutorContext): string {
  return resolve(workspaceRoot, getProjectRoot(context));
}
