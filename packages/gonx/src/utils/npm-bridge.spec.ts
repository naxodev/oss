import { describe, it, expect, mock, spyOn } from 'bun:test';
import * as nxDevkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { getProjectScope } from './npm-bridge';

mock.module('@nx/devkit', () => ({
  readJson: mock(),
}));

describe('Npm bridge', () => {
  describe('Method: getProjectScope', () => {
    it('should return project scope', () => {
      spyOn(nxDevkit, 'readJson').mockReturnValueOnce({
        name: '@naxodev/gonx',
      });
      expect(getProjectScope(createTreeWithEmptyWorkspace())).toBe('naxodev');
    });
  });
});
