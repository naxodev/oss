import { describe, it, expect, mock, spyOn } from 'bun:test';
import type { ExecutorContext } from '@nx/devkit';
import * as commonFunctions from '../../utils';
import {
  buildFlagIfEnabled,
  buildStringFlagIfValid,
} from '../../utils/execute-command';
import executor from './executor';
import type { TestExecutorSchema } from './schema';

mock.module('../../utils', () => {
  return {
    buildFlagIfEnabled,
    buildStringFlagIfValid,
    executeCommand: mock().mockResolvedValue({ success: true }),
    extractProjectRoot: mock(() => 'apps/project'),
  };
});

const options: TestExecutorSchema = {};

const context: ExecutorContext = {
  cwd: 'current-dir',
  root: '',
  isVerbose: false,
} as ExecutorContext;

describe('Test Executor', () => {
  it('should execute test of a go project with default options', async () => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor(options, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(['test', './...'], {
      cwd: 'apps/project',
    });
  });

  it.each([
    [{ verbose: true }, '-v'],
    [{ cover: true }, '-cover'],
    [{ coverProfile: 'coverage.out' }, '-coverprofile=coverage.out'],
    [{ race: true }, '-race'],
    [{ run: 'TestProjection' }, '-run=TestProjection'],
    [{ count: 1 }, '-count=1'],
    [{ timeout: '10m' }, '-timeout=10m'],
  ])('should add flag %p if enabled', async (config, flag) => {
    const spyExecute = spyOn(commonFunctions, 'executeCommand');
    const output = await executor({ ...options, ...config }, context);
    expect(output.success).toBeTruthy();
    expect(spyExecute).toHaveBeenCalledWith(expect.arrayContaining([flag]), {
      cwd: 'apps/project',
    });
  });
});
