import { expect, it, spyOn } from 'bun:test';
import { createServer } from 'node:net';
import { isPackagePublished, waitForPublishedPackage } from './npm-registry';

const release = { packageName: '@naxodev/gonx', version: '5.0.1' };
const manifest = { name: release.packageName, version: release.version };
const packagePath = '/%40naxodev%2Fgonx';
const versionPath = `${packagePath}/${release.version}`;

function fallbackRegistry(
  packageDocument: (request: Request) => Response | Promise<Response>,
  delayMs = 0
) {
  const paths: string[] = [];
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      paths.push(path);
      if (delayMs) await Bun.sleep(delayMs);
      if (path === versionPath) return new Response(null, { status: 404 });
      if (path === packagePath) return packageDocument(request);
      return new Response('unexpected registry path', { status: 400 });
    },
  });
  return {
    server,
    paths,
    options: { registry: server.url.href, maxAttempts: 1 },
  };
}

it('waits beyond five missing reads so a successful publish is not reported as failed', async () => {
  const expected = { packageName: '@naxodev/gonx', version: '4.1.2' };
  let reads = 0;
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      if (new URL(request.url).pathname === '/%40naxodev%2Fgonx')
        return Response.json({ name: expected.packageName, versions: {} });
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
    ).rejects.toThrow(
      'after 2 attempts: version and package URLs returned HTTP 404'
    );
    expect(diagnostics.at(-1)).toContain('package URLs returned HTTP 404');
  } finally {
    registry.stop(true);
  }
});

it('verifies a published release even while the version URL serves a stale 404', async () => {
  const { server, paths, options } = fallbackRegistry((request) => {
    expect(request.headers.get('accept')).toBe(
      'application/vnd.npm.install-v1+json'
    );
    return Response.json({
      name: release.packageName,
      versions: { [release.version]: manifest },
    });
  });
  try {
    expect(await isPackagePublished(release, options)).toBe(false);
    expect(paths.splice(0)).toEqual([versionPath]);
    await expect(
      waitForPublishedPackage(release, options)
    ).resolves.toBeUndefined();
    expect(paths).toEqual([versionPath, packagePath]);
  } finally {
    server.stop(true);
  }
});

it.each([
  ['wrong document name', 'other', manifest, 'invalid package metadata'],
  [
    'wrong entry name',
    release.packageName,
    { ...manifest, name: 'other' },
    'different package identity',
  ],
  [
    'wrong entry version',
    release.packageName,
    { ...manifest, version: '5.0.0' },
    'different package identity',
  ],
] as const)(
  'rejects fallback metadata with %s',
  async (_, name, entry, error) => {
    const { server, options, paths } = fallbackRegistry(() =>
      Response.json({ name, versions: { [release.version]: entry } })
    );
    try {
      await expect(
        waitForPublishedPackage(release, {
          ...options,
          maxAttempts: 2,
          retryDelayMs: 0,
        })
      ).rejects.toThrow(error);
      expect(paths).toEqual([versionPath, packagePath]);
    } finally {
      server.stop(true);
    }
  }
);

it('lets each slow read use its own timeout within the overall deadline', async () => {
  const { server, options } = fallbackRegistry(
    () =>
      Response.json({
        name: release.packageName,
        versions: { [release.version]: manifest },
      }),
    300
  );
  try {
    const lookup = (maxWaitMs: number) =>
      waitForPublishedPackage(release, {
        ...options,
        requestTimeoutMs: 500,
        maxWaitMs,
      });
    await expect(lookup(2_000)).resolves.toBeUndefined();
    await expect(lookup(500)).rejects.toThrow();
  } finally {
    server.stop(true);
  }
});

it('rejects an oversized package document even without a content-length header', async () => {
  const { server, options } = fallbackRegistry(
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            const chunk = new Uint8Array(1024 * 1024).fill(32);
            for (let i = 0; i < 9; i++) controller.enqueue(chunk);
            controller.close();
          },
        })
      )
  );
  try {
    await expect(waitForPublishedPackage(release, options)).rejects.toThrow(
      'metadata exceeds'
    );
  } finally {
    server.stop(true);
  }
});

it('continues polling the exact version without downloading oversized package history again', async () => {
  const paths: string[] = [];
  let reads = 0;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      paths.push(path);
      if (path === versionPath)
        return ++reads < 3
          ? new Response(null, { status: 404 })
          : Response.json(manifest);
      if (path === packagePath)
        return new Response(new Uint8Array(8 * 1024 * 1024 + 1));
      return new Response(null, { status: 400 });
    },
  });
  try {
    await waitForPublishedPackage(release, {
      registry: server.url.href,
      maxAttempts: 3,
      retryDelayMs: 0,
    });
    expect(paths).toEqual([versionPath, packagePath, versionPath, versionPath]);
  } finally {
    server.stop(true);
  }
});

it('times out a stalled fallback before the overall deadline', async () => {
  const { server, options, paths } = fallbackRegistry(async () => {
    await Bun.sleep(500);
    return Response.json({
      name: manifest.name,
      versions: { [release.version]: manifest },
    });
  });
  try {
    await expect(
      waitForPublishedPackage(release, {
        ...options,
        requestTimeoutMs: 150,
        maxWaitMs: 2000,
      })
    ).rejects.toThrow('request failed');
    expect(paths).toEqual([versionPath, packagePath]);
  } finally {
    server.stop(true);
  }
});

it('backs off to 30 seconds while the package lists only the previous version', async () => {
  const name = '@naxodev/gonx';
  const { server, options } = fallbackRegistry(() =>
    Response.json({
      name,
      'dist-tags': { latest: '5.0.1' },
      versions: { '5.0.0': { name, version: '5.0.0' } },
    })
  );
  const sleep = spyOn(Bun, 'sleep').mockResolvedValue(undefined);
  try {
    await expect(
      waitForPublishedPackage(
        { packageName: name, version: '5.0.1' },
        {
          ...options,
          retryDelayMs: 10_000,
          maxAttempts: 5,
        }
      )
    ).rejects.toThrow(
      'after 5 attempts: version URL returned HTTP 404; package document does not list the version'
    );
    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([
      10_000, 20_000, 30_000, 30_000,
    ]);
  } finally {
    sleep.mockRestore();
    server.stop(true);
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
