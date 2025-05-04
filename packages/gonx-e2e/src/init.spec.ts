import {
  fileExists,
  tmpProjPath,
  runNxCommandAsync,
  ensureNxProject,
  cleanup,
} from '@nx/plugin/testing';
import { join } from 'path';

describe('gonx:init', () => {
  beforeEach(() => {
    ensureNxProject('@naxodev/gonx', 'dist/packages/gonx');
  });

  afterEach(() => cleanup());

  it('should successfully initialize a project with gonx', async () => {
    // Run the init generator
    const result = await runNxCommandAsync('generate @naxodev/gonx:init');
    expect(result.stdout).toContain('nx g @naxodev/gonx:init');

    // Verify go.work or go.mod file was created
    const hasGoWork = fileExists(join(tmpProjPath(), 'go.work'));
    const hasGoMod = fileExists(join(tmpProjPath(), 'go.mod'));
    expect(hasGoWork || hasGoMod).toBeTruthy();

    // Verify nx.json was updated with the plugin
    const nxJson = JSON.parse(
      require('fs').readFileSync(join(tmpProjPath(), 'nx.json'), 'utf-8')
    );
    const hasGonxPlugin = nxJson.plugins?.some(
      (plugin) =>
        typeof plugin === 'object' && plugin.plugin === '@naxodev/gonx'
    );
    expect(hasGonxPlugin).toBeTruthy();
  }, 30_000);

  it('should work when running nx add @naxodev/gonx', async () => {
    try {
      // This simulates running `nx add @naxodev/gonx`
      const result = await runNxCommandAsync('g @naxodev/gonx:init', {
        env: { NX_ADD_PLUGINS: 'true' },
      });

      expect(result.stdout).toContain('nx g @naxodev/gonx:init');
      // Verify the project has been initialized correctly
      const hasGoWork = fileExists(join(tmpProjPath(), 'go.work'));
      const hasGoMod = fileExists(join(tmpProjPath(), 'go.mod'));
      expect(hasGoWork || hasGoMod).toBeTruthy();
    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  }, 30_000);
});
