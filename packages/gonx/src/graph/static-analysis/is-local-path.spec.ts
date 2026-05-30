import { isLocalPath } from './is-local-path';

describe('isLocalPath', () => {
  describe('local paths', () => {
    it('should return true for relative path starting with ./', () => {
      expect(isLocalPath('./common')).toBe(true);
    });

    it('should return true for relative path starting with ../', () => {
      expect(isLocalPath('../libs/common')).toBe(true);
    });

    it('should return true for absolute path', () => {
      expect(isLocalPath('/absolute/path/to/module')).toBe(true);
    });

    it('should return true for path without dots in first element', () => {
      expect(isLocalPath('local/path')).toBe(true);
    });
  });

  describe('module paths', () => {
    it('should return false for github.com path', () => {
      expect(isLocalPath('github.com/myorg/myrepo')).toBe(false);
    });

    it('should return false for example.com path', () => {
      expect(isLocalPath('example.com/pkg')).toBe(false);
    });

    it('should return false for custom domain path', () => {
      expect(isLocalPath('mycompany.io/internal/utils')).toBe(false);
    });

    it('should return false for golang.org path', () => {
      expect(isLocalPath('golang.org/x/tools')).toBe(false);
    });

    it('should return false for gopkg.in path', () => {
      expect(isLocalPath('gopkg.in/yaml.v3')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return true for single word without dot', () => {
      expect(isLocalPath('vendor')).toBe(true);
    });

    it('should return false for word with dot', () => {
      expect(isLocalPath('example.test')).toBe(false);
    });
  });
});
