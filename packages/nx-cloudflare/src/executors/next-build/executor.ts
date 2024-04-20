/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import {
  detectPackageManager,
  ExecutorContext,
  getPackageManagerCommand,
  logger,
  readJsonFile,
  workspaceRoot,
  writeJsonFile,
} from '@nx/devkit';
import { createLockFile, createPackageJson, getLockFileName } from '@nx/js';
import { join, resolve as pathResolve } from 'path';
import {
  copySync,
  ensureDirSync,
  existsSync,
  mkdir,
  writeFileSync,
} from 'fs-extra';
import { gte } from 'semver';
import { directoryExists } from '@nx/workspace/src/utilities/fileutils';
import { checkAndCleanWithSemver } from '@nx/devkit/src/utils/semver';

import { updatePackageJson } from './lib/update-package-json';
import { createNextConfigFile } from './lib/create-next-config-file';
import { checkPublicDirectory } from './lib/check-project';
import { NextBuildBuilderOptions } from '../../utils/types';
import { execSync, ExecSyncOptions } from 'child_process';
import { createCliOptions } from '../../utils/create-cli-options';

// This executor is a modified version of the original `@nrwl/next:build` executor.
// It's main modification is to use the cloudflare next-on-pages package.
// Because the Cloudflare builder doesn't allow us to locate the build output outside the project root directory
// we need to change the output path config options to the project root directory and then copy the build output to the desired output path.
// We also move from invoking the bin script to executing the command with the `execSync` function. This is because the bin script
// is not exported on the package.json
export default async function buildExecutor(
  options: NextBuildBuilderOptions,
  context: ExecutorContext
) {
  // Cast to any to overwrite NODE_ENV
  (process.env as any).NODE_ENV ||= 'production';

  const projectRoot = context.projectGraph.nodes[context.projectName].data.root;

  checkPublicDirectory(projectRoot);

  // Set `__NEXT_REACT_ROOT` based on installed ReactDOM version
  const packageJsonPath = join(projectRoot, 'package.json');
  const packageJson = existsSync(packageJsonPath)
    ? readJsonFile(packageJsonPath)
    : undefined;
  const rootPackageJson = readJsonFile(join(context.root, 'package.json'));
  const reactDomVersion =
    packageJson?.dependencies?.['react-dom'] ??
    rootPackageJson.dependencies?.['react-dom'];
  const hasReact18 =
    reactDomVersion &&
    gte(checkAndCleanWithSemver('react-dom', reactDomVersion), '18.0.0');
  if (hasReact18) {
    process.env['__NEXT_REACT_ROOT'] ||= 'true';
  }
  ensureDirSync(join(projectRoot, '.vercel'));

  const { outputPath: originalOutputPath } = options;
  // Set the outputPath to the projectRoot to bypass cloudflare builded limitations.
  options.outputPath = projectRoot;

  try {
    runCliBuild(projectRoot, options);
  } catch (error) {
    logger.error(`Error occurred while trying to run the build command`);
    logger.error(error);
    return { success: false };
  }

  if (!directoryExists(options.outputPath)) {
    mkdir(options.outputPath);
  }

  const builtPackageJson = createPackageJson(
    context.projectName,
    context.projectGraph,
    {
      target: context.targetName,
      root: context.root,
      isProduction: !options.includeDevDependenciesInPackageJson, // By default we remove devDependencies since this is a production build.
    }
  );

  // Update `package.json` to reflect how users should run the build artifacts
  builtPackageJson.scripts = {
    start: 'next start',
  };

  updatePackageJson(builtPackageJson, context);
  writeJsonFile(`${options.outputPath}/package.json`, builtPackageJson);

  if (options.generateLockfile) {
    const packageManager = detectPackageManager(context.root);
    const lockFile = createLockFile(
      builtPackageJson,
      context.projectGraph,
      packageManager
    );
    writeFileSync(
      `${options.outputPath}/${getLockFileName(packageManager)}`,
      lockFile,
      {
        encoding: 'utf-8',
      }
    );
  }

  // If output path is different from source path, then copy over the config and public files.
  // This is the default behavior when running `nx build <app>`.
  if (originalOutputPath.replace(/\/$/, '') !== projectRoot) {
    createNextConfigFile(options, context);
    copySync(join(projectRoot, 'public'), join(originalOutputPath, 'public'), {
      dereference: true,
    });
    // Copy the .vercel directory to the original output path so that the Cloudflare Cloud builder can find it.
    copySync(
      join(projectRoot, '.vercel'),
      join(originalOutputPath, '.vercel'),
      {
        dereference: true,
      }
    );
    process.env.NX_NEXT_OUTPUT_PATH ??= originalOutputPath;
  }

  return { success: true };
}

function runCliBuild(projectRoot: string, options: NextBuildBuilderOptions) {
  const { experimentalAppOnly, profile, debug, outputPath } = options;

  // Set output path here since it can also be set via CLI
  // We can retrieve it inside plugins/with-nx
  process.env.NX_NEXT_OUTPUT_PATH ??= outputPath;

  const args = createCliOptions({ experimentalAppOnly, profile, debug });

  const cwd = pathResolve(workspaceRoot, projectRoot);

  const pmc = getPackageManagerCommand('npm');
  const execSyncOptions: ExecSyncOptions = {
    stdio: ['inherit', 'inherit', 'inherit'],
    encoding: 'utf-8',
    cwd,
  };

  execSync(
    `${pmc.exec} @cloudflare/next-on-pages ${args.join(' ')}`,
    execSyncOptions
  );
}
