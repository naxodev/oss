import * as devkit from '@nx/devkit';
import { addProjectConfiguration, readJson, Tree, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import libraryGenerator from './generator';

describe('library generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
  });

  describe('not nested', () => {
    it('should generate files', async () => {
      // Set up project configurations
      addProjectConfiguration(tree, 'myGoLib', {
        root: 'libs/myGoLib',
        sourceRoot: 'libs/myGoLib',
        projectType: 'library',
        targets: {
          build: {
            executor: '@nx/go:build',
          },
          test: {
            executor: '@nx/go:test',
          },
        },
      });

      // Create necessary directories and files
      tree.write('libs/myGoLib/myGoLib.go', 'package mygolib');
      tree.write('libs/myGoLib/myGoLib_test.go', 'package mygolib');
      tree.write('libs/myGoLib/go.mod', 'module mygolib');
      writeJson(tree, 'libs/myGoLib/package.json', {
        name: 'myGoLib',
      });
      writeJson(tree, 'libs/myGoLib/project.json', {
        name: 'myGoLib',
        sourceRoot: 'libs/myGoLib',
        projectType: 'library',
      });

      // Mock the names function from nx/devkit used in the generator
      jest.spyOn(devkit, 'names').mockReturnValue({
        name: 'myGoLib',
        className: 'MyGoLib',
        propertyName: 'myGoLib',
        constantName: 'MY_GO_LIB',
        fileName: 'my-go-lib',
      });

      await libraryGenerator(tree, {
        directory: 'myGoLib',
        tags: 'domain,shared',
      });

      // Verify files exist
      expect(tree.exists('libs/myGoLib/myGoLib.go')).toBeTruthy();
      expect(tree.exists('libs/myGoLib/myGoLib_test.go')).toBeTruthy();
      expect(tree.exists('libs/myGoLib/go.mod')).toBeTruthy();
      expect(tree.exists('libs/myGoLib/package.json')).toBeTruthy();
      expect(tree.exists('libs/myGoLib/project.json')).toBeTruthy();

      // Verify content
      const packageJson = readJson(tree, 'libs/myGoLib/package.json');
      expect(packageJson.name).toEqual('myGoLib');

      const projectJson = readJson(tree, 'libs/myGoLib/project.json');
      expect(projectJson.name).toEqual('myGoLib');
      expect(projectJson.sourceRoot).toEqual('libs/myGoLib');
      expect(projectJson.projectType).toEqual('library');
    });
  });

  describe('nested', () => {
    it('should generate files in nested directory', async () => {
      // Set up project configurations
      addProjectConfiguration(tree, 'myGoLib', {
        root: 'libs/myDir/myGoLib',
        sourceRoot: 'libs/myDir/myGoLib',
        projectType: 'library',
        targets: {
          build: {
            executor: '@nx/go:build',
          },
          test: {
            executor: '@nx/go:test',
          },
        },
        tags: ['domain', 'shared'],
      });

      // Create necessary directories and files
      tree.write('libs/myDir/myGoLib/myGoLib.go', 'package mygolib');
      tree.write('libs/myDir/myGoLib/myGoLib_test.go', 'package mygolib');
      tree.write('libs/myDir/myGoLib/go.mod', 'module mygolib');
      writeJson(tree, 'libs/myDir/myGoLib/package.json', {
        name: 'myGoLib',
      });
      writeJson(tree, 'libs/myDir/myGoLib/project.json', {
        name: 'myGoLib',
        sourceRoot: 'libs/myDir/myGoLib',
        projectType: 'library',
      });

      // Mock the names function from nx/devkit used in the generator
      jest.spyOn(devkit, 'names').mockReturnValue({
        name: 'myGoLib',
        className: 'MyGoLib',
        propertyName: 'myGoLib',
        constantName: 'MY_GO_LIB',
        fileName: 'my-go-lib',
      });

      await libraryGenerator(tree, {
        name: 'myGoLib',
        directory: 'myDir/myGoLib',
        tags: 'domain,shared',
      });

      // Verify files exist
      expect(tree.exists('libs/myDir/myGoLib/myGoLib.go')).toBeTruthy();
      expect(tree.exists('libs/myDir/myGoLib/myGoLib_test.go')).toBeTruthy();
      expect(tree.exists('libs/myDir/myGoLib/go.mod')).toBeTruthy();
      expect(tree.exists('libs/myDir/myGoLib/package.json')).toBeTruthy();
      expect(tree.exists('libs/myDir/myGoLib/project.json')).toBeTruthy();

      // Verify content
      const packageJson = readJson(tree, 'libs/myDir/myGoLib/package.json');
      expect(packageJson.name).toEqual('myGoLib');

      const projectJson = readJson(tree, 'libs/myDir/myGoLib/project.json');
      expect(projectJson.name).toEqual('myGoLib');
      expect(projectJson.sourceRoot).toEqual('libs/myDir/myGoLib');
      expect(projectJson.projectType).toEqual('library');
    });
  });

  describe('--skipFormat', () => {
    it('should format files by default', async () => {
      // Create necessary directories for files
      tree.write('libs/myGoLib/myGoLib.go', 'package mygolib');
      jest.spyOn(devkit, 'formatFiles');

      await libraryGenerator(tree, {
        directory: 'myGoLib',
      });

      expect(devkit.formatFiles).toHaveBeenCalled();
    });

    it('should not format files when --skipFormat=true', async () => {
      // Create necessary directories for files
      tree.write('libs/myGoLib/myGoLib.go', 'package mygolib');
      jest.spyOn(devkit, 'formatFiles');

      await libraryGenerator(tree, {
        directory: 'myGoLib',
        skipFormat: true,
      });

      expect(devkit.formatFiles).not.toHaveBeenCalled();
    });
  });
});
