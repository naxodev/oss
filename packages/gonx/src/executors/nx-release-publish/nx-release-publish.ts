import {
  ExecutorContext,
  joinPathFragments,
  NxJsonConfiguration,
  output,
  readJsonFile,
} from '@nx/devkit';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env as appendLocalEnv } from 'npm-run-path';
import { NxReleasePublishExecutorSchema } from './schema';
import chalk = require('chalk');

const LARGE_BUFFER = 1024 * 1000000;
const DEFAULT_TAG_PATTERN = 'v{version}';

function processEnv(color: boolean) {
  const env = {
    ...process.env,
    ...appendLocalEnv(),
  };

  if (color) {
    env.FORCE_COLOR = `${color}`;
  }
  return env;
}

/**
 * Gets the release tag pattern from nx.json configuration
 * @param workspaceRoot The root of the workspace
 * @param projectName The name of the project
 * @returns The tag pattern to use for releases
 */
function getReleaseTagPattern(
  workspaceRoot: string,
  projectName: string
): string {
  try {
    const nxJsonPath = join(workspaceRoot, 'nx.json');
    const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);

    // Check for release configuration in nx.json
    if (nxJson.release && nxJson.release.releaseTagPattern) {
      // Replace {projectName} with the actual project name in the pattern
      const tagPattern = nxJson.release.releaseTagPattern.replace(
        '{projectName}',
        projectName
      );

      return tagPattern;
    }

    // Return default pattern if nothing specific is found
    return DEFAULT_TAG_PATTERN;
  } catch (err) {
    console.warn(
      `Warning: Could not read nx.json to determine tag pattern: ${err}`
    );
    return DEFAULT_TAG_PATTERN;
  }
}

/**
 * Gets the latest version from git tags based on the pattern
 * @param moduleRoot Root directory of the module
 * @param tagPattern Pattern to match tags
 * @param projectName Name of the project
 * @returns The latest version tag
 */
function getLatestVersionFromGit(
  moduleRoot: string,
  tagPattern: string
): string {
  try {
    // Create a git command that finds the latest tag matching our pattern
    // Replace {version} with a wildcard in the pattern for the git command
    const gitPattern = tagPattern.replace('{version}', '*');

    // Command to get the latest tag matching our pattern
    const gitTagCmd = `git tag --sort=-v:refname | grep -E "${gitPattern}" | head -n 1 || echo "${tagPattern.replace(
      '{version}',
      '0.0.0'
    )}"`;

    output.logSingleLine(`Running: ${gitTagCmd}`);
    const latestTag = execSync(gitTagCmd, {
      env: processEnv(true),
      cwd: moduleRoot,
      stdio: 'pipe',
    })
      .toString()
      .trim();

    return latestTag;
  } catch (err) {
    console.warn(`Warning: Failed to get latest version from git: ${err}`);
    return tagPattern.replace('{version}', '0.0.0');
  }
}

export default async function runExecutor(
  options: NxReleasePublishExecutorSchema,
  context: ExecutorContext
) {
  /**
   * We need to check both the env var and the option because the executor may have been triggered
   * indirectly via dependsOn, in which case the env var will be set, but the option will not.
   */
  const isDryRun = process.env.NX_DRY_RUN === 'true' || options.dryRun || false;
  const projectName = context.projectName;

  if (!projectName) {
    output.error({ title: 'Project name is undefined' });
    return { success: false };
  }

  const projectConfig = context.projectsConfigurations?.projects[projectName];

  if (!projectConfig) {
    output.error({
      title: `Project configuration for ${projectName} not found`,
    });
    return { success: false };
  }

  const moduleRoot = joinPathFragments(
    context.root,
    options.moduleRoot ?? projectConfig.root
  );

  const goModPath = joinPathFragments(moduleRoot, 'go.mod');
  const goModContents = readFileSync(goModPath, 'utf-8');
  const moduleMatch = goModContents.match(/module\s+([^\s]+)/);

  if (!moduleMatch) {
    output.error({ title: `Could not find module name in ${goModPath}` });
    return { success: false };
  }

  const moduleName = moduleMatch[1];

  try {
    // Get the release tag pattern from nx.json
    const tagPattern = getReleaseTagPattern(context.root, projectName);
    output.logSingleLine(`Using release tag pattern: ${tagPattern}`);

    // Get the current version (tag) based on the pattern
    const currentTag = getLatestVersionFromGit(moduleRoot, tagPattern);

    if (!currentTag) {
      output.error({
        title: `Could not determine current version for ${projectName}. Please make sure there is at least one tag that matches the pattern ${tagPattern}.`,
      });
      return { success: false };
    }

    output.logSingleLine(`Found latest version tag: ${currentTag}`);

    // Prepare GOPROXY command
    const goPublishCommand = `GOPROXY=proxy.golang.org go list -m ${moduleName}@${currentTag}`;

    output.logSingleLine(
      `Publishing ${chalk.bold(moduleName)} at version ${chalk.bold(
        currentTag
      )}...`
    );

    if (isDryRun) {
      console.log(`Would run: ${goPublishCommand}`);
      console.log(
        `Would publish module ${chalk.cyan(moduleName)} at version ${chalk.cyan(
          currentTag
        )} to the Go proxy, but ${chalk.keyword('orange')('[dry-run]')} was set`
      );
    } else {
      output.logSingleLine(`Running "${goPublishCommand}"...`);

      execSync(goPublishCommand, {
        maxBuffer: LARGE_BUFFER,
        env: processEnv(true),
        cwd: moduleRoot,
        stdio: 'inherit',
      });

      console.log('');
      console.log(
        `Published ${chalk.cyan(moduleName)}@${chalk.cyan(
          currentTag
        )} to Go proxy`
      );
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Publication failed:', err.message);
    }
    return {
      success: false,
    };
  }
}
