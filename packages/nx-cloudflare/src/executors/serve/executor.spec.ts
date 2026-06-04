import { EventEmitter } from 'events';
import type { ExecutorContext } from '@nx/devkit';

const spawnMock = jest.fn();
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

const waitForPortOpenMock = jest.fn();
jest.mock('@nx/web/src/utils/wait-for-port-open', () => ({
  waitForPortOpen: (...args: unknown[]) => waitForPortOpenMock(...args),
}));

import serveExecutor from './executor';

function fakeServer() {
  const cp = new EventEmitter() as EventEmitter & { killed: boolean };
  cp.killed = false;
  return cp;
}

const context = (root = 'apps/my-worker'): ExecutorContext =>
  ({
    projectName: 'my-worker',
    projectsConfigurations: { version: 2, projects: { 'my-worker': { root } } },
  } as unknown as ExecutorContext);

describe('serve executor', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    waitForPortOpenMock.mockReset();
  });

  it('spawns wrangler dev in the resolved project cwd and yields the base url', async () => {
    const server = fakeServer();
    spawnMock.mockReturnValue(server);
    waitForPortOpenMock.mockResolvedValue(undefined);

    const gen = serveExecutor({ port: 8787 } as never, context());
    const first = await gen.next();

    const [bin, argv, opts] = spawnMock.mock.calls[0];
    expect(bin).toBe(process.execPath);
    expect(argv[0]).toMatch(/wrangler/);
    expect(argv[1]).toBe('dev');
    expect(opts.cwd).toContain('apps/my-worker');
    expect(opts.stdio).toBe('inherit');
    expect(first.value).toEqual({
      success: true,
      baseUrl: 'http://localhost:8787',
    });

    await gen.return?.(undefined as never);
  });

  it('attaches an error handler so a failed spawn does not crash uncaught', async () => {
    const server = fakeServer();
    spawnMock.mockReturnValue(server);
    // Keep the port watcher pending so the only settlement path is the error.
    waitForPortOpenMock.mockReturnValue(new Promise(() => undefined));

    const gen = serveExecutor({ port: 8787 } as never, context());
    const next = gen.next();
    await Promise.resolve();

    expect(server.listenerCount('error')).toBeGreaterThan(0);
    // Emitting 'error' must be handled (no throw) and reject the iteration.
    server.emit('error', new Error('spawn ENOENT'));
    await expect(next).rejects.toThrow(/wrangler|worker/i);
  });
});
