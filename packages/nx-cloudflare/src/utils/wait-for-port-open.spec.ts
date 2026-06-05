import * as net from 'net';
import { waitForPortOpen } from './wait-for-port-open';

// Exercises the real retry/connect logic against ephemeral ports — the executor
// spec mocks this module, so this is the only place the vendored poller runs.
describe('waitForPortOpen', () => {
  const servers: net.Server[] = [];

  function listen(port = 0): Promise<number> {
    const server = net.createServer();
    servers.push(server);
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        const address = server.address();
        resolve(typeof address === 'object' && address ? address.port : 0);
      });
    });
  }

  // Grab a port the OS just handed out, then release it — gives us a port
  // that is guaranteed free (and therefore refusing connections) right now.
  async function freePort(): Promise<number> {
    const port = await listen();
    await new Promise<void>((resolve) => servers.pop()?.close(() => resolve()));
    return port;
  }

  afterEach(async () => {
    await Promise.all(
      servers
        .splice(0)
        .map(
          (server) =>
            new Promise<void>((resolve) => server.close(() => resolve()))
        )
    );
  });

  it('resolves once the port is accepting connections', async () => {
    const port = await listen();
    await expect(waitForPortOpen(port)).resolves.toBeUndefined();
  });

  it('retries while the port is refused, then resolves when it opens', async () => {
    const port = await freePort();
    const pending = waitForPortOpen(port, { retries: 50, retryDelay: 20 });

    // Open the server only after the first connection attempts have been
    // refused, forcing the retry loop to be what eventually succeeds.
    await new Promise((resolve) => setTimeout(resolve, 60));
    await listen(port);

    await expect(pending).resolves.toBeUndefined();
  });

  it('rejects with ECONNREFUSED after retries are exhausted', async () => {
    const port = await freePort();
    await expect(
      waitForPortOpen(port, { retries: 1, retryDelay: 10 })
    ).rejects.toMatchObject({ code: 'ECONNREFUSED' });
  });

  it('rejects immediately on a non-retryable error code', async () => {
    // `.invalid` never resolves (RFC 2606) → ENOTFOUND, which is not in the
    // allowed list. The huge retryDelay means this can only pass if the error
    // short-circuits the retry loop instead of waiting it out.
    await expect(
      waitForPortOpen(1234, {
        host: 'host.invalid',
        retries: 100,
        retryDelay: 5000,
      })
    ).rejects.toMatchObject({ code: 'ENOTFOUND' });
  });
});
