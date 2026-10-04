import { expect, it } from 'bun:test';
import { createServer } from 'node:net';
import { isPackagePublished, waitForPublishedPackage } from './npm-registry';

it('waits beyond five missing reads so a successful publish is not reported as failed', async () => {
  const expected = { packageName: '@naxodev/gonx', version: '4.1.2' };
  let reads = 0;
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      expect(new URL(request.url).pathname).toBe('/%40naxodev%2Fgonx/4.1.2');
      reads++;
      return reads <= 5
        ? Response.json({ error: 'not found' }, { status: 404 })
        : Response.json({
            name: expected.packageName,
            version: expected.version,
          });
    },
  });
  try {
    await expect(
      waitForPublishedPackage(expected, {
        registry: `http://127.0.0.1:${registry.port}/`,
        retryDelayMs: 0,
      })
    ).resolves.toBeUndefined();
  } finally {
    registry.stop(true);
  }
});

it('does not report an authorization failure as an unpublished version', async () => {
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => Response.json({ error: 'forbidden' }, { status: 403 }),
  });
  try {
    await expect(
      isPackagePublished(
        { packageName: '@naxodev/gonx', version: '4.1.2' },
        { registry: `http://127.0.0.1:${registry.port}/` }
      )
    ).rejects.toThrow('HTTP 403');
  } finally {
    registry.stop(true);
  }
});

it('rejects a successful HTTP response for a different package version', async () => {
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => Response.json({ name: '@naxodev/gonx', version: '4.1.1' }),
  });
  try {
    await expect(
      isPackagePublished(
        { packageName: '@naxodev/gonx', version: '4.1.2' },
        { registry: `http://127.0.0.1:${registry.port}/` }
      )
    ).rejects.toThrow('different package identity');
  } finally {
    registry.stop(true);
  }
});

it('stops after a bounded retry budget and reports the last registry result', async () => {
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => Response.json({ error: 'not found' }, { status: 404 }),
  });
  const diagnostics: string[] = [];
  try {
    await expect(
      waitForPublishedPackage(
        { packageName: '@naxodev/gonx', version: '4.1.2' },
        {
          registry: `http://127.0.0.1:${registry.port}/`,
          retryDelayMs: 0,
          maxAttempts: 2,
          onRetry: (message) => diagnostics.push(message),
        }
      )
    ).rejects.toThrow('after 2 attempts: version not visible (HTTP 404)');
    expect(diagnostics.at(-1)).toContain('HTTP 404');
  } finally {
    registry.stop(true);
  }
});

it('bounds a stalled registry request so verification cannot hang', async () => {
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch() {
      await Bun.sleep(250);
      return Response.json({ name: '@naxodev/gonx', version: '4.1.2' });
    },
  });
  try {
    await expect(
      waitForPublishedPackage(
        { packageName: '@naxodev/gonx', version: '4.1.2' },
        {
          registry: `http://127.0.0.1:${registry.port}/`,
          retryDelayMs: 0,
          maxAttempts: 1,
          requestTimeoutMs: 25,
        }
      )
    ).rejects.toThrow('request failed');
  } finally {
    registry.stop(true);
  }
}, 1_000);

it('retries a registry outage instead of treating it as a missing or failed publication', async () => {
  const expected = { packageName: '@naxodev/gonx', version: '4.1.2' };
  let reads = 0;
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch() {
      reads++;
      return reads === 1
        ? Response.json({ error: 'unavailable' }, { status: 503 })
        : Response.json({
            name: expected.packageName,
            version: expected.version,
          });
    },
  });
  try {
    await expect(
      waitForPublishedPackage(expected, {
        registry: `http://127.0.0.1:${registry.port}/`,
        retryDelayMs: 0,
      })
    ).resolves.toBeUndefined();
  } finally {
    registry.stop(true);
  }
});

it('keeps visibility verification inside its wall-clock budget even when retry delay is longer', async () => {
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => Response.json({ error: 'not found' }, { status: 404 }),
  });
  try {
    await expect(
      waitForPublishedPackage(
        { packageName: '@naxodev/gonx', version: '4.1.2' },
        {
          registry: `http://127.0.0.1:${registry.port}/`,
          retryDelayMs: 10_000,
          maxWaitMs: 50,
        }
      )
    ).rejects.toThrow('Could not verify');
  } finally {
    registry.stop(true);
  }
}, 1_000);

it('rejects registry credentials and external test endpoints before sending requests', async () => {
  const expected = { packageName: '@naxodev/gonx', version: '4.1.2' };
  await expect(
    isPackagePublished(expected, {
      registry: 'https://user:password@registry.npmjs.org/',
    })
  ).rejects.toThrow('without credentials');
  await expect(
    isPackagePublished(expected, { registry: 'http://example.com/' })
  ).rejects.toThrow('public npm over HTTPS');
});

it('rejects coordinates that could escape the version endpoint or GitHub output contract', async () => {
  await expect(
    isPackagePublished({ packageName: '../other', version: '4.1.2' })
  ).rejects.toThrow('Invalid npm package name');
  await expect(
    isPackagePublished({
      packageName: '@naxodev/gonx',
      version: '4.1.2\nskip=false',
    })
  ).rejects.toThrow('Invalid exact npm package version');
});

it('retries an interrupted metadata response instead of misclassifying it as invalid JSON', async () => {
  let reads = 0;
  const registry = createServer((socket) => {
    socket.once('data', () => {
      reads++;
      if (reads === 1) {
        socket.write(
          'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 1000\r\nConnection: close\r\n\r\n{"name":',
          () => {
            void Bun.sleep(50).then(() => socket.destroy());
          }
        );
      } else {
        const body = JSON.stringify({
          name: '@naxodev/gonx',
          version: '4.1.2',
        });
        socket.end(
          `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(
            body
          )}\r\nConnection: close\r\n\r\n${body}`
        );
      }
    });
  });
  await new Promise<void>((resolve) =>
    registry.listen(0, '127.0.0.1', resolve)
  );
  const address = registry.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing registry test port');
  try {
    await expect(
      waitForPublishedPackage(
        { packageName: '@naxodev/gonx', version: '4.1.2' },
        { registry: `http://127.0.0.1:${address.port}/`, retryDelayMs: 0 }
      )
    ).resolves.toBeUndefined();
  } finally {
    await new Promise<void>((resolve) => registry.close(() => resolve()));
  }
});

it('fails on malformed JSON instead of accepting or retrying corrupted package metadata', async () => {
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => new Response('{ not valid JSON'),
  });
  try {
    await expect(
      waitForPublishedPackage(
        { packageName: '@naxodev/gonx', version: '4.1.2' },
        {
          registry: `http://127.0.0.1:${registry.port}/`,
          retryDelayMs: 0,
          maxAttempts: 2,
        }
      )
    ).rejects.toThrow('invalid JSON metadata');
  } finally {
    registry.stop(true);
  }
});
