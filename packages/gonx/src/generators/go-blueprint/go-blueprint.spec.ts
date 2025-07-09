import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { execSync } from 'child_process';

import { goBlueprintGenerator } from './go-blueprint';
import { GoBlueprintGeneratorSchema } from './schema';

jest.mock('child_process');
const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('go-blueprint generator', () => {
  let tree: Tree;
  const options: GoBlueprintGeneratorSchema = { directory: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
  });

  it('should validate go-blueprint binary is installed', async () => {
    mockedExecSync.mockReturnValue(Buffer.from('go-blueprint version 1.0.0'));

    await expect(goBlueprintGenerator(tree, options)).resolves.not.toThrow();
    expect(mockedExecSync).toHaveBeenCalledWith('go-blueprint version', {
      stdio: 'ignore',
    });
  });

  it('should throw error when go-blueprint binary is not installed', async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    await expect(goBlueprintGenerator(tree, options)).rejects.toThrow(
      'go-blueprint binary not found'
    );
    expect(mockedExecSync).toHaveBeenCalledWith('go-blueprint version', {
      stdio: 'ignore',
    });
  });
});
