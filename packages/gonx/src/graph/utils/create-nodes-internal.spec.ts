import { describe, it, expect, mock } from 'bun:test';
import type { CreateNodesContext } from '@nx/devkit';
import { createNodesInternal } from './create-nodes-internal';
import {
  GO_SOURCE_FILE_PATTERNS,
  GO_SOURCE_NAMED_INPUT,
} from './get-targets-by-project-type';

mock.module('./has-main-package', () => ({
  hasMainPackage: mock().mockReturnValue(false),
}));

describe('createNodesInternal', () => {
  const context = {} as CreateNodesContext;

  it('should define the goSource named input on every inferred project', () => {
    const result = createNodesInternal('libs/proj-a/go.mod', {}, context);

    expect(result.projects['libs/proj-a'].namedInputs).toEqual({
      [GO_SOURCE_NAMED_INPUT]: GO_SOURCE_FILE_PATTERNS,
    });
  });
});
