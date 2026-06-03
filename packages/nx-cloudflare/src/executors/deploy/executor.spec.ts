import { EventEmitter } from 'events';
import type { ExecutorContext } from '@nx/devkit';

const spawnMock = jest.fn();
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

import deployExecutor from './executor';

function fakeChild() {
  const cp = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  cp.stdout = new EventEmitter();
  cp.stderr = new EventEmitter();
  return cp;
}

const context = (root = 'apps/my-worker'): ExecutorContext =>
  ({
    projectName: 'my-worker',
    projectsConfigurations: { version: 2, projects: { 'my-worker': { root } } },
  } as unknown as ExecutorContext);

describe('deploy executor', () => {
  beforeEach(() => spawnMock.mockReset());

  it('spawns wrangler deploy in the resolved project cwd', async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = deployExecutor({ env: 'production' } as never, context());
    const [bin, argv, opts] = spawnMock.mock.calls[0];

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(bin).toBe(process.execPath);
    expect(argv[0]).toMatch(/wrangler/);
    expect(argv[1]).toBe('deploy');
    expect(argv).toContain('--env=production');
    expect(opts.cwd).toContain('apps/my-worker');

    child.emit('close', 0);
    await expect(promise).resolves.toEqual({ success: true });
  });

  it('maps a non-zero exit code to failure', async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const promise = deployExecutor({} as never, context());
    child.emit('close', 1);
    await expect(promise).resolves.toEqual({ success: false });
  });

  it('rejects instead of hanging when the child fails to spawn', async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const promise = deployExecutor({} as never, context());
    child.emit('error', new Error('spawn ENOENT'));
    await expect(promise).rejects.toThrow(/wrangler/i);
  });
});
