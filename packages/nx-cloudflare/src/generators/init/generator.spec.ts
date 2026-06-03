import { addDependenciesToPackageJson, readJson, Tree } from '@nx/devkit';
import initGenerator from './generator';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

describe('init', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  describe(addDependenciesToPackageJson.name, () => {
    it('should add the base dependencies', async () => {
      const existing = 'existing';
      const existingVersion = '1.0.0';
      addDependenciesToPackageJson(
        tree,
        { [existing]: existingVersion },
        { [existing]: existingVersion }
      );
      await initGenerator(tree, {});
      const packageJson = readJson(tree, 'package.json');
      // add `wrangler`
      expect(packageJson.dependencies['wrangler']).toBeUndefined();
      expect(packageJson.devDependencies['wrangler']).toBeDefined();
      // add tslib
      expect(packageJson.dependencies['tslib']).toBeDefined();
      // add `@cloudflare/workers-types` to dev
      expect(
        packageJson.dependencies['@cloudflare/workers-types']
      ).toBeUndefined();
      expect(
        packageJson.dependencies['@cloudflare/vitest-pool-workers']
      ).toBeUndefined();
      expect(
        packageJson.devDependencies['@cloudflare/workers-types']
      ).toBeDefined();
      expect(
        packageJson.devDependencies['@cloudflare/vitest-pool-workers']
      ).toBeDefined();
      // keep existing packages
      expect(packageJson.devDependencies[existing]).toBeDefined();
      expect(packageJson.dependencies[existing]).toBeDefined();
    });

    it('does not add @naxodev/nx-cloudflare to the generated workspace', async () => {
      // The plugin invoking the generator is already installed; re-pinning it
      // to a registry version is redundant and collides with the e2e file:
      // install. Mirrors how @naxodev/gonx's init leaves the plugin alone.
      await initGenerator(tree, {});
      const packageJson = readJson(tree, 'package.json');
      expect(
        packageJson.dependencies?.['@naxodev/nx-cloudflare']
      ).toBeUndefined();
      expect(
        packageJson.devDependencies?.['@naxodev/nx-cloudflare']
      ).toBeUndefined();
    });

    it('should add hono if the hono template is selected', async () => {
      await initGenerator(tree, { template: 'hono' });
      const packageJson = readJson(tree, 'package.json');
      // adds `hono`
      expect(packageJson.dependencies['hono']).toBeDefined();
    });
  });

  it('should not add jest config by default', async () => {
    await initGenerator(tree, {});
    expect(tree.exists('jest.config.js')).toEqual(false);
  });
});
