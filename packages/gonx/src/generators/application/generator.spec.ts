import * as devkit from '@nx/devkit';
import { addProjectConfiguration, readJson, Tree, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import applicationGenerator from './generator';

describe('application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
  });

  describe('not nested', () => {
    it('should generate files', async () => {
      // Set up project configurations
      addProjectConfiguration(tree, 'myGoApp', {
        root: 'apps/myGoApp',
        sourceRoot: 'apps/myGoApp',
        projectType: 'application',
        targets: {
          build: {
            executor: '@nx/go:build',
          },
          serve: {
            executor: '@nx/go:serve',
          },
          test: {
            executor: '@nx/go:test',
          },
        },
      });

      // Create necessary directories for the files
      tree.write('apps/myGoApp/main.go', 'package main');
      tree.write('apps/myGoApp/go.mod', 'module myGoApp');
      writeJson(tree, 'apps/myGoApp/package.json', {
        name: 'myGoApp',
      });
      writeJson(tree, 'apps/myGoApp/project.json', {
        name: 'myGoApp',
        sourceRoot: 'apps/myGoApp',
        projectType: 'application',
      });

      // Run the generator
      await applicationGenerator(tree, {
        directory: 'myGoApp',
        tags: 'api,backend',
      });

      // Verify files exist
      expect(tree.exists('apps/myGoApp/main.go')).toBeTruthy();
      expect(tree.exists('apps/myGoApp/go.mod')).toBeTruthy();
      expect(tree.exists('apps/myGoApp/package.json')).toBeTruthy();
      expect(tree.exists('apps/myGoApp/project.json')).toBeTruthy();

      // Verify content
      const packageJson = readJson(tree, 'apps/myGoApp/package.json');
      expect(packageJson.name).toEqual('myGoApp');

      const projectJson = readJson(tree, 'apps/myGoApp/project.json');
      expect(projectJson.name).toEqual('myGoApp');
      expect(projectJson.sourceRoot).toEqual('apps/myGoApp');
      expect(projectJson.projectType).toEqual('application');
    });
  });

  describe('nested', () => {
    it('should generate files in nested directory', async () => {
      // Set up project configurations
      addProjectConfiguration(tree, 'myGoApp', {
        root: 'apps/myDir/myGoApp',
        sourceRoot: 'apps/myDir/myGoApp',
        projectType: 'application',
        targets: {
          build: {
            executor: '@nx/go:build',
          },
          serve: {
            executor: '@nx/go:serve',
          },
          test: {
            executor: '@nx/go:test',
          },
        },
        tags: ['api', 'backend'],
      });

      // Create necessary directories for the files
      tree.write('apps/myDir/myGoApp/main.go', 'package main');
      tree.write('apps/myDir/myGoApp/go.mod', 'module myGoApp');
      writeJson(tree, 'apps/myDir/myGoApp/package.json', {
        name: 'myGoApp',
      });
      writeJson(tree, 'apps/myDir/myGoApp/project.json', {
        name: 'myGoApp',
        sourceRoot: 'apps/myDir/myGoApp',
        projectType: 'application',
      });

      await applicationGenerator(tree, {
        name: 'myGoApp',
        directory: 'myDir/myGoApp',
        tags: 'api,backend',
      });

      // Verify files exist
      expect(tree.exists('apps/myDir/myGoApp/main.go')).toBeTruthy();
      expect(tree.exists('apps/myDir/myGoApp/go.mod')).toBeTruthy();
      expect(tree.exists('apps/myDir/myGoApp/package.json')).toBeTruthy();
      expect(tree.exists('apps/myDir/myGoApp/project.json')).toBeTruthy();

      // Verify content
      const packageJson = readJson(tree, 'apps/myDir/myGoApp/package.json');
      expect(packageJson.name).toEqual('myGoApp');

      const projectJson = readJson(tree, 'apps/myDir/myGoApp/project.json');
      expect(projectJson.name).toEqual('myGoApp');
      expect(projectJson.sourceRoot).toEqual('apps/myDir/myGoApp');
      expect(projectJson.projectType).toEqual('application');
    });
  });

  describe('--skipFormat', () => {
    it('should format files by default', async () => {
      // Create necessary directories for the files
      tree.write('apps/myGoApp/main.go', 'package main');
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, {
        directory: 'myGoApp',
      });

      expect(devkit.formatFiles).toHaveBeenCalled();
    });

    it('should not format files when --skipFormat=true', async () => {
      // Create necessary directories for the files
      tree.write('apps/myGoApp/main.go', 'package main');
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, {
        directory: 'myGoApp',
        skipFormat: true,
      });

      expect(devkit.formatFiles).not.toHaveBeenCalled();
    });
  });
});
