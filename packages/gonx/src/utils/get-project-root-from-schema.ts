import { getWorkspaceLayout, joinPathFragments, Tree } from '@nx/devkit';

export function getProjectRootFromSchema(
  host: Tree,
  projectDirectory: string,
  projectType: 'application' | 'library'
): string {
  const workspaceLayoutRoot =
    projectType === 'application'
      ? getWorkspaceLayout(host).appsDir
      : getWorkspaceLayout(host).libsDir;

  if (workspaceLayoutRoot) {
    if (projectDirectory.startsWith(workspaceLayoutRoot)) {
      return projectDirectory;
    }
    return joinPathFragments(workspaceLayoutRoot, projectDirectory);
  }
  return projectDirectory;
}
