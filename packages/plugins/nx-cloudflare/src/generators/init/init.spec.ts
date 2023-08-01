import { addDependenciesToPackageJson, readJson, Tree } from '@nx/devkit';
import { nxCloudflareVersion } from '../../utils/versions';
import initGenerator from './init';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

describe('init', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should add dependencies', async () => {
    const existing = 'existing';
    const existingVersion = '1.0.0';
    addDependenciesToPackageJson(
      tree,
      {
        '@naxo/nx-cloudflare': nxCloudflareVersion,
        [existing]: existingVersion,
      },
      { [existing]: existingVersion }
    );
    await initGenerator(tree, {});
    const packageJson = readJson(tree, 'package.json');
    // add `wrangler`
    expect(packageJson.dependencies['wrangler']).toBeUndefined();
    expect(packageJson.devDependencies['wrangler']).toBeDefined();
    // add tslib
    expect(packageJson.dependencies['tslib']).toBeDefined();
    // move `@naxo/nx-cloudflare` to dev
    expect(packageJson.dependencies['@naxo/nx-cloudflare']).toBeUndefined();
    expect(packageJson.devDependencies['@naxo/nx-cloudflare']).toBeDefined();
    // move `@cloudflare/workers-types` to dev
    expect(
      packageJson.dependencies['@cloudflare/workers-types']
    ).toBeUndefined();
    expect(packageJson.devDependencies['@naxo/nx-cloudflare']).toBeDefined();
    // add express types
    expect(packageJson.devDependencies['@types/express']).toBeDefined();
    // keep existing packages
    expect(packageJson.devDependencies[existing]).toBeDefined();
    expect(packageJson.dependencies[existing]).toBeDefined();
  });

  it('should not add jest config by default', async () => {
    await initGenerator(tree, {});
    expect(tree.exists('jest.config.js')).toEqual(false);
  });
});
