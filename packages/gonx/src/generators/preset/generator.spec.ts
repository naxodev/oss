import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from 'bun:test';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import * as appGeneratorModule from '../application/generator';
import * as libGeneratorModule from '../library/generator';
import * as blueprintGeneratorModule from '../go-blueprint/go-blueprint';
import presetGenerator from './generator';
import type { PresetGeneratorSchema } from './schema';

describe('preset generator', () => {
  let tree: Tree;
  const baseOptions: PresetGeneratorSchema = {
    directory: 'test-dir',
    name: 'test-project',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    spyOn(appGeneratorModule, 'default').mockResolvedValue(undefined);
    spyOn(libGeneratorModule, 'default').mockResolvedValue(undefined);
    spyOn(blueprintGeneratorModule, 'default').mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should run application generator by default', async () => {
    await presetGenerator(tree, baseOptions);
    expect(appGeneratorModule.default).toHaveBeenCalledWith(tree, baseOptions);
    expect(libGeneratorModule.default).not.toHaveBeenCalled();
  });

  it('should run library generator when type is library', async () => {
    const options = { ...baseOptions, type: 'library' as const };
    await presetGenerator(tree, options);
    expect(libGeneratorModule.default).toHaveBeenCalledWith(tree, options);
    expect(appGeneratorModule.default).not.toHaveBeenCalled();
  });

  it('should run application generator when type is binary', async () => {
    const options = { ...baseOptions, type: 'binary' as const };
    await presetGenerator(tree, options);
    expect(appGeneratorModule.default).toHaveBeenCalledWith(tree, options);
    expect(libGeneratorModule.default).not.toHaveBeenCalled();
  });

  it('should handle additional options and pass them through', async () => {
    const options = {
      ...baseOptions,
      type: 'library' as const,
      skipFormat: true,
      addGoDotWork: true,
      tags: 'test,lib',
    };
    await presetGenerator(tree, options);
    expect(libGeneratorModule.default).toHaveBeenCalledWith(tree, options);
    expect(appGeneratorModule.default).not.toHaveBeenCalled();
  });

  it('should handle undefined type as default application', async () => {
    const options = { ...baseOptions, type: undefined };
    await presetGenerator(tree, options);
    expect(appGeneratorModule.default).toHaveBeenCalledWith(tree, options);
    expect(libGeneratorModule.default).not.toHaveBeenCalled();
  });

  describe('go-blueprint type', () => {
    it('should run go-blueprint generator when type is go-blueprint', async () => {
      const options = {
        ...baseOptions,
        type: 'go-blueprint' as const,
        framework: 'gin' as const,
        driver: 'postgres' as const,
        git: 'commit' as const,
      };
      await presetGenerator(tree, options);
      expect(blueprintGeneratorModule.default).toHaveBeenCalledWith(tree, {
        ...options,
        feature: [],
      });
      expect(appGeneratorModule.default).not.toHaveBeenCalled();
      expect(libGeneratorModule.default).not.toHaveBeenCalled();
    });

    it('should provide default values for go-blueprint required options', async () => {
      const options = {
        ...baseOptions,
        type: 'go-blueprint' as const,
      };
      await presetGenerator(tree, options);
      expect(blueprintGeneratorModule.default).toHaveBeenCalledWith(tree, {
        ...options,
        driver: 'none',
        framework: 'gin',
        git: 'skip',
        feature: [],
      });
    });

    it('should preserve provided go-blueprint options', async () => {
      const options = {
        ...baseOptions,
        type: 'go-blueprint' as const,
        framework: 'fiber' as const,
        driver: 'mysql' as const,
        git: 'stage' as const,
        feature: ['docker', 'react'],
      };
      await presetGenerator(tree, options);
      expect(blueprintGeneratorModule.default).toHaveBeenCalledWith(
        tree,
        options
      );
    });

    it('should handle partial go-blueprint options with defaults', async () => {
      const options = {
        ...baseOptions,
        type: 'go-blueprint' as const,
        framework: 'echo' as const,
        // driver and git not provided
      };
      await presetGenerator(tree, options);
      expect(blueprintGeneratorModule.default).toHaveBeenCalledWith(tree, {
        ...options,
        driver: 'none',
        git: 'skip',
        feature: [],
      });
    });

    it('should pass through additional preset options to go-blueprint generator', async () => {
      const options = {
        ...baseOptions,
        type: 'go-blueprint' as const,
        framework: 'chi' as const,
        driver: 'sqlite' as const,
        git: 'commit' as const,
        skipFormat: true,
        addGoDotWork: true,
        tags: 'api,service',
      };
      await presetGenerator(tree, options);
      expect(blueprintGeneratorModule.default).toHaveBeenCalledWith(tree, {
        ...options,
        feature: [],
      });
    });
  });
});
