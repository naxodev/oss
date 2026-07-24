import { describe, it, expect, beforeEach } from 'bun:test';
import {
  type NxJsonConfiguration,
  type Tree,
  readNxJson,
  updateNxJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { GO_SOURCE_FILE_PATTERNS } from '../../graph/utils/get-targets-by-project-type';
import update from './ensure-go-source-named-input';

describe('update-4-1-1: ensure goSource named input', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  // WHY: an upgraded consumer never re-runs `init`, so without this migration
  // a Go->non-Go dependency edge makes Nx abort hashing with
  // "Input 'goSource' is not defined". The migration must add the fallback.
  it('adds the goSource named input to nx.json when it is missing', async () => {
    await update(tree);

    const nxJson = readNxJson(tree) as NxJsonConfiguration;
    expect(nxJson.namedInputs?.goSource).toEqual(GO_SOURCE_FILE_PATTERNS);
  });

  // WHY: a consumer may have tuned their own goSource patterns; a migration
  // that clobbers them would silently change every gonx target's cache key.
  it('does not overwrite an existing user-defined goSource named input', async () => {
    const custom = ['{projectRoot}/**/*.go'];
    const nxJson = readNxJson(tree) as NxJsonConfiguration;
    updateNxJson(tree, {
      ...nxJson,
      namedInputs: { ...nxJson.namedInputs, goSource: custom },
    });

    await update(tree);

    expect(readNxJson(tree)?.namedInputs?.goSource).toEqual(custom);
  });
});
