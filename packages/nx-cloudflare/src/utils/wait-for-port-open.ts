import { logger } from '@nx/devkit';
import * as net from 'net';

interface WaitForPortOpenOptions {
  host?: string;
  retries?: number;
  retryDelay?: number;
}

// Vendored from `@nx/web/src/utils/wait-for-port-open` to avoid a deep,
// unstable `@nx/*/src/...` import (and the `@nx/web` dependency it required).
// Polls a TCP port until something accepts a connection — used to detect when
// `wrangler dev` is ready to serve.
export function waitForPortOpen(
  port: number,
  options: WaitForPortOpenOptions = {}
): Promise<void> {
  // Default to the IPv4 loopback: Node may resolve "localhost" to IPv6 ("::1"),
  // which fails if the server only listens on IPv4 (as `wrangler dev` does).
  // Callers can override via `options.host`.
  const host = options.host ?? '127.0.0.1';
  const allowedErrorCodes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'];

  return new Promise((resolve, reject) => {
    const checkPort = (retries = options.retries ?? 120) => {
      const client = new net.Socket();
      const cleanupClient = () => {
        client.removeAllListeners('connect');
        client.removeAllListeners('error');
        client.end();
        client.destroy();
        client.unref();
      };

      client.once('connect', () => {
        cleanupClient();
        resolve();
      });

      client.once('error', (err: NodeJS.ErrnoException) => {
        if (retries === 0 || !allowedErrorCodes.includes(err.code ?? '')) {
          if (process.env['NX_VERBOSE_LOGGING'] === 'true') {
            logger.info(
              `Error connecting on ${host}:${port}: ${err.code || err}`
            );
          }
          cleanupClient();
          reject(err);
        } else {
          setTimeout(() => checkPort(retries - 1), options.retryDelay ?? 1000);
        }
      });

      if (process.env['NX_VERBOSE_LOGGING'] === 'true') {
        logger.info(`Connecting on ${host}:${port}`);
      }
      client.connect({ port, host });
    };

    checkPort();
  });
}
