/* eslint-disable @typescript-eslint/no-unused-vars */
import { ProjectGraph, Tree } from '@nx/devkit';
import { join } from 'node:path';
import { VersionActions } from 'nx/release';
import { NxReleaseVersionConfiguration } from 'nx/src/config/nx-json';

type ProxyGolangOrgVersionResponse = {
  Version: string;
  Time: string;
  Origin: {
    VCS: 'git';
    URL: string;
    Ref: string;
    Hash: string;
  };
};

const MANIFEST_FILENAME = 'go.mod';

// NOTE: We use the full project path as the project name, which ensures compatibility
// with Go's release tagging convention (projectRoot/vx.x.x) and prevents name conflicts.

/**
 * Implements versioning actions for Go projects.
 * This class manages versioning operations for Go modules using Git tags.
 */
export default class GoVersionActions extends VersionActions {
  validManifestFilenames: string[] = [MANIFEST_FILENAME];

  // The `go.mod` file does not contain the package version.
  // The version must be retrieved from Git tags or the Go registry.
  // For `nx release --first-release`, a default fallback is provided for the git-tag strategy.
  async readCurrentVersionFromSourceManifest(
    tree: Tree
  ): Promise<{ currentVersion: string; manifestPath: string } | null> {
    return {
      currentVersion: '0.0.0',
      manifestPath: join(this.projectGraphNode.data.root, 'go.mod'),
    };
  }

  // Retrieve the module name of the project and attempt to fetch its version from the Go registry.
  async readCurrentVersionFromRegistry(
    tree: Tree,
    currentVersionResolverMetadata: NxReleaseVersionConfiguration['currentVersionResolverMetadata']
  ): Promise<{ currentVersion: string | null; logText: string } | null> {
    try {
      const manifestPath = join(
        this.projectGraphNode.data.root,
        MANIFEST_FILENAME
      );
      const content = tree.read(manifestPath, 'utf-8');
      const moduleNameMatch = content.match(/module\s+([^\s]+)/);
      const moduleName = moduleNameMatch ? moduleNameMatch[1] : '';

      const result = await fetch(
        `https://proxy.golang.org/${encodeURIComponent(moduleName)}/@latest`
      );

      if (result?.ok) {
        const response = (await result.json()) as ProxyGolangOrgVersionResponse;
        // Get the latest version from the list
        const latestVersion = response.Version;

        return {
          currentVersion: latestVersion,
          logText: `Retrieved version ${latestVersion} from proxy.golang.org for ${moduleName}`,
        };
      }
    } catch (error) {
      console.error(error);
      throw new Error(
        `Unable to determine the current version of "${this.projectGraphNode.name}" from  proxy.golang.org.`
      );
    }
  }

  // For local dependencies, Go ignores the version specified in the module and always uses the one in the local path.
  readCurrentVersionOfDependency(
    tree: Tree,
    projectGraph: ProjectGraph,
    dependencyProjectName: string
  ): Promise<{
    currentVersion: string | null;
    dependencyCollection: string | null;
  }> {
    throw new Error('Method not implemented.');
  }

  // Since go.mod does not contain the version, we cannot update it.
  async updateProjectVersion(
    tree: Tree,
    newVersion: string
  ): Promise<string[]> {
    // We do nothing on go projects by default
    return [];
  }

  // For local dependencies, Go ignores the version specified in the module and always uses the one in the local path.
  // However, we could implement this in the future to improve the consistency and readability of the code.
  async updateProjectDependencies(
    tree: Tree,
    projectGraph: ProjectGraph,
    dependenciesToUpdate: Record<string, string>
  ): Promise<string[]> {
    return [];
  }
}
