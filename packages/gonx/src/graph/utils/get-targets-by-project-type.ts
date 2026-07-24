import { TargetConfiguration } from '@nx/devkit';
import { GoPluginOptions } from '../types/go-plugin-options';

/**
 * Name of the Nx named input (defined per-project in
 * `createNodesInternal`, and as a workspace-level fallback in nx.json by
 * `ensureGoSourceNamedInput`) that resolves to `GO_SOURCE_FILE_PATTERNS`.
 *
 * Targets reference dependency source via the `^goSource` form of this
 * name rather than inlining `GO_SOURCE_FILE_PATTERNS` with a `^` prefix,
 * because Nx resolves `^goSource` against *each dependency's own*
 * namedInputs (which may legitimately differ per project), not against the
 * consuming project's file patterns.
 */
export const GO_SOURCE_NAMED_INPUT = 'goSource';

/**
 * File patterns that make up a Go project's compiled/analyzed source, for
 * both the project-local named input (`goSource`) and the cache `inputs` on
 * targets whose output depends on that source (build, lint, tidy, test,
 * generate).
 *
 * Go compiles, vets, and resolves module dependencies against the *source*
 * of every module it imports -- not just its own files. In a go.work or
 * replace-directive monorepo, an app can depend on a local library whose
 * source lives in another Nx project. If only the app's own files are
 * hashed, editing the library produces a stale cache hit for the app's
 * build/test/lint/tidy targets (see #217).
 *
 * `build`, `test`, `lint`, and `tidy` therefore hash `['goSource',
 * '^goSource']`: `^goSource` walks the project's Nx dependency graph and
 * hashes every dependency's `goSource` inputs too, transitively, so an
 * app -> lib1 -> lib2 chain invalidates correctly however deep it goes.
 *
 * `go.work`/`go.work.sum` are included at the workspace root because they
 * change module resolution for *every* Go project in the workspace, not
 * just the one that owns them; when the workspace doesn't use a Go
 * workspace file, these patterns simply match nothing.
 *
 * `generate` intentionally stays project-local (`['goSource']` only): its
 * go:generate directives only read the local module, and correctness
 * relative to dependencies is already handled by `dependsOn: ['^generate']`
 * rather than by cache-input hashing.
 */
export const GO_SOURCE_FILE_PATTERNS = [
  '{projectRoot}/go.mod',
  '{projectRoot}/go.sum',
  '{projectRoot}/**/*.go',
  '{workspaceRoot}/go.work',
  '{workspaceRoot}/go.work.sum',
];

const GO_SOURCE_INPUTS = [GO_SOURCE_NAMED_INPUT, `^${GO_SOURCE_NAMED_INPUT}`];
const GO_SOURCE_LOCAL_ONLY_INPUTS = [GO_SOURCE_NAMED_INPUT];

function buildTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:build',
    cache: true,
    dependsOn: ['generate'],
    inputs: GO_SOURCE_INPUTS,
    options: {
      outputPath: 'dist/{projectRoot}/',
    },
    outputs: ['{options.outputPath}'],
  };
}

function serveTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:serve',
    continuous: true,
    options: {},
  };
}

function lintTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:lint',
    cache: true,
    inputs: GO_SOURCE_INPUTS,
  };
}

function tidyTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:tidy',
    cache: true,
    inputs: GO_SOURCE_INPUTS,
  };
}

function testTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:test',
    cache: true,
    dependsOn: ['generate', '^build'],
    inputs: GO_SOURCE_INPUTS,
  };
}

function generateTarget(): TargetConfiguration {
  return {
    executor: '@naxodev/gonx:generate',
    cache: true,
    dependsOn: ['^generate'],
    inputs: GO_SOURCE_LOCAL_ONLY_INPUTS,
  };
}

/**
 * Creates a release-publish target configuration for a Go project
 * @param projectRoot The root path of the project
 * @returns The target configuration for releasing and publishing the Go module
 */
function releasePublishTarget(projectRoot: string): TargetConfiguration {
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

/**
 * Builds the target table for a Go project.
 *
 * @param projectRoot The root path of the project
 * @param options The plugin options, used to resolve custom target names
 * @param isApplication Whether the project is an application (has a main
 * package) or a library. Callers must detect this themselves (see
 * `hasMainPackage`) and pass it in, rather than this function re-detecting
 * it, since detection does filesystem I/O and must run exactly once per
 * project.
 */
export function getTargetsByProjectType(
  projectRoot: string,
  options: GoPluginOptions,
  isApplication: boolean
): Record<string, TargetConfiguration> {
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
  targets[generateTargetName] = generateTarget();
  targets[testTargetName] = testTarget();
  targets[tidyTargetName] = tidyTarget();
  targets[lintTargetName] = lintTarget();
  targets[releasePublishTargetName] = releasePublishTarget(projectRoot);

  // Build and run targets - only for applications
  if (isApplication) {
    targets[buildTargetName] = buildTarget();

    targets[serveTargetName] = serveTarget();
  }

  return targets;
}
