import { expect } from 'bun:test';
import { promisify } from 'util';
import treeKill from 'tree-kill';
import { logError, logInfo, logSuccess } from './log-utils';
import { check as portCheck } from 'tcp-port-used';
import { createServer, type AddressInfo } from 'node:net';

/** Find an unused loopback TCP port for a test server. */
export function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

/** Check whether a fixture process still exists without sending it a signal. */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const kill = require('kill-port');
const KILL_PORT_DELAY = 5000;

export const promisifiedTreeKill: (
  pid: number,
  signal: string
) => Promise<void> = promisify(treeKill);

export async function killPort(port: number): Promise<boolean> {
  if (await portCheck(port)) {
    let killPortResult;
    try {
      logInfo(`Attempting to close port ${port}`);
      killPortResult = await kill(port);
      await new Promise<void>((resolve) =>
        setTimeout(() => resolve(), KILL_PORT_DELAY)
      );
      if (await portCheck(port)) {
        logError(`Port ${port} still open`, JSON.stringify(killPortResult));
      } else {
        logSuccess(`Port ${port} successfully closed`);
        return true;
      }
    } catch {
      logError(`Port ${port} closing failed`);
    }
    return false;
  } else {
    return true;
  }
}

export async function killPorts(port?: number): Promise<boolean> {
  return port
    ? await killPort(port)
    : (await killPort(3333)) && (await killPort(4200));
}

export async function killProcessAndPorts(
  pid: number | undefined,
  ...ports: number[]
): Promise<void> {
  try {
    if (pid) {
      await promisifiedTreeKill(pid, 'SIGKILL');
    }
    for (const port of ports) {
      await killPort(port);
    }
  } catch (err) {
    expect(err).toBeFalsy();
  }
}
