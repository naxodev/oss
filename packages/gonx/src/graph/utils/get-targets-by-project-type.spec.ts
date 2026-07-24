import { describe, it, expect } from 'bun:test';
import { getTargetsByProjectType } from './get-targets-by-project-type';
import { GoPluginOptions } from '../types/go-plugin-options';

// The target `inputs` arrays ARE the cache key Nx hashes against, so they're
// asserted as exact literals rather than with a loose shape match -- any
// unintentional drift here silently changes cache hashes for every consumer.
//
// build/test/lint/tidy hash `['goSource', '^goSource']`: `^goSource` pulls
// in each dependency's own `goSource` named input (transitively), so that
// editing a local library in a go.work/replace-directive monorepo correctly
// invalidates the cache for apps that compile its source (fix for #217).
// `generate` stays project-local (`['goSource']`) since its go:generate
// directives only read the local module.
const GO_SOURCE_INPUTS = ['goSource', '^goSource'];
const GO_SOURCE_LOCAL_ONLY_INPUTS = ['goSource'];

describe('getTargetsByProjectType', () => {
  describe('library projects (isApplication: false)', () => {
    it('should create the common targets with default names', () => {
      const targets = getTargetsByProjectType('libs/proj-a', {}, false);

      expect(Object.keys(targets).sort()).toEqual(
        ['generate', 'test', 'tidy', 'lint', 'nx-release-publish'].sort()
      );
    });

    it('should not create build or serve targets', () => {
      const targets = getTargetsByProjectType('libs/proj-a', {}, false);

      expect(targets.build).toBeUndefined();
      expect(targets.serve).toBeUndefined();
    });

    it('should shape the generate target', () => {
      const targets = getTargetsByProjectType('libs/proj-a', {}, false);

      expect(targets.generate).toEqual({
        executor: '@naxodev/gonx:generate',
        cache: true,
        dependsOn: ['^generate'],
        inputs: GO_SOURCE_LOCAL_ONLY_INPUTS,
      });
    });

    it('should shape the test target', () => {
      const targets = getTargetsByProjectType('libs/proj-a', {}, false);

      expect(targets.test).toEqual({
        executor: '@naxodev/gonx:test',
        cache: true,
        dependsOn: ['generate', '^build'],
        inputs: GO_SOURCE_INPUTS,
      });
    });

    it('should shape the tidy target', () => {
      const targets = getTargetsByProjectType('libs/proj-a', {}, false);

      expect(targets.tidy).toEqual({
        executor: '@naxodev/gonx:tidy',
        cache: true,
        inputs: GO_SOURCE_INPUTS,
      });
    });

    it('should shape the lint target', () => {
      const targets = getTargetsByProjectType('libs/proj-a', {}, false);

      expect(targets.lint).toEqual({
        executor: '@naxodev/gonx:lint',
        cache: true,
        inputs: GO_SOURCE_INPUTS,
      });
    });

    it('should shape the release-publish target using the project root', () => {
      const targets = getTargetsByProjectType('libs/proj-a', {}, false);

      expect(targets['nx-release-publish']).toEqual({
        executor: '@naxodev/gonx:release-publish',
        options: {
          moduleRoot: 'libs/proj-a',
        },
        configurations: {
          development: {
            dryRun: true,
          },
        },
      });
    });
  });

  describe('application projects (isApplication: true)', () => {
    it('should create build and serve targets in addition to the common ones', () => {
      const targets = getTargetsByProjectType('apps/proj-a', {}, true);

      expect(Object.keys(targets).sort()).toEqual(
        [
          'generate',
          'test',
          'tidy',
          'lint',
          'nx-release-publish',
          'build',
          'serve',
        ].sort()
      );
    });

    it('should shape the build target', () => {
      const targets = getTargetsByProjectType('apps/proj-a', {}, true);

      expect(targets.build).toEqual({
        executor: '@naxodev/gonx:build',
        cache: true,
        dependsOn: ['generate'],
        inputs: GO_SOURCE_INPUTS,
        options: {
          outputPath: 'dist/{projectRoot}/',
        },
        outputs: ['{options.outputPath}'],
      });
    });

    it('should shape the serve target', () => {
      const targets = getTargetsByProjectType('apps/proj-a', {}, true);

      expect(targets.serve).toEqual({
        executor: '@naxodev/gonx:serve',
        continuous: true,
        options: {},
      });
    });
  });

  describe('custom target names', () => {
    const options: GoPluginOptions = {
      buildTargetName: 'go-build',
      testTargetName: 'go-test',
      runTargetName: 'go-serve',
      tidyTargetName: 'go-tidy',
      lintTargetName: 'go-lint',
      generateTargetName: 'go-generate',
      releasePublishTargetName: 'go-publish',
    };

    it('should honor custom names for an application', () => {
      const targets = getTargetsByProjectType('apps/proj-a', options, true);

      expect(Object.keys(targets).sort()).toEqual(
        [
          'go-build',
          'go-test',
          'go-serve',
          'go-tidy',
          'go-lint',
          'go-generate',
          'go-publish',
        ].sort()
      );
    });

    it('should honor custom names for a library, omitting build/serve', () => {
      const targets = getTargetsByProjectType('libs/proj-a', options, false);

      expect(Object.keys(targets).sort()).toEqual(
        ['go-test', 'go-tidy', 'go-lint', 'go-generate', 'go-publish'].sort()
      );
      expect(targets['go-build']).toBeUndefined();
      expect(targets['go-serve']).toBeUndefined();
    });
  });
});
