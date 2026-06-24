import { describe, it, expect, beforeEach, mock, type Mock } from 'bun:test';
import { Tree, joinPathFragments, updateJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { bindingGenerator } from './generator';
import { runWranglerTypes } from '../../utils/run-wrangler-types';
import { provisionResource } from '../../utils/provision';

// Mock the side-effecting modules so unit tests never shell out. Mirrors the
// create-cloudflare spec's run-c3 mock pattern. The callback returned by the
// generator calls these post-flush on the real fs — in tests we assert the
// callback was returned and invoke it to verify the mock was called.
mock.module('../../utils/run-wrangler-types', () => ({
  runWranglerTypes: mock(() => {}),
}));
mock.module('../../utils/provision', () => ({
  provisionResource: mock(() => {}),
  PROVISION_SENTINEL: '__PENDING_CREATE__',
}));

const runWranglerTypesMock = runWranglerTypes as unknown as Mock<
  typeof runWranglerTypes
>;
const provisionResourceMock = provisionResource as unknown as Mock<
  typeof provisionResource
>;

const WRANGLER_JSONC = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts"
}
`;

const INDEX_TS = `export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Hello!');
  },
};
`;

function seedWorker(
  tree: Tree,
  projectRoot: string,
  projectName: string
): void {
  updateJson(tree, 'package.json', (pkg) => ({
    ...pkg,
    workspaces: [...(pkg.workspaces ?? []), `${projectRoot}/package.json`],
  }));
  tree.write(
    joinPathFragments(projectRoot, 'package.json'),
    JSON.stringify({ name: projectName })
  );
  tree.write(joinPathFragments(projectRoot, 'wrangler.jsonc'), WRANGLER_JSONC);
  tree.write(joinPathFragments(projectRoot, 'src/index.ts'), INDEX_TS);
}

describe('binding generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    runWranglerTypesMock.mockClear();
    provisionResourceMock.mockClear();
  });

  describe('config editing', () => {
    it('appends a KV namespace binding to wrangler.jsonc', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'kv',
        binding: 'MY_KV',
        id: 'abc123',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"kv_namespaces"');
      expect(config).toContain('"binding": "MY_KV"');
      expect(config).toContain('"id": "abc123"');
    });

    it('appends an R2 bucket binding', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'r2',
        binding: 'MY_BUCKET',
        bucketName: 'my-bucket',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"r2_buckets"');
      expect(config).toContain('"bucket_name": "my-bucket"');
    });

    it('appends a D1 database binding', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'd1',
        binding: 'MY_DB',
        databaseName: 'my-db',
        id: 'd1-id-123',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"d1_databases"');
      expect(config).toContain('"database_name": "my-db"');
      expect(config).toContain('"database_id": "d1-id-123"');
    });

    it('appends a Service binding', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'service',
        binding: 'AUTH_SERVICE',
        name: 'auth-worker',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"services"');
      expect(config).toContain('"service": "auth-worker"');
    });

    it('writes a placeholder when no id/bucketName/databaseName is provided', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'kv',
        binding: 'MY_KV',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('PLACEHOLDER_FILL_ME_IN');
    });

    it('preserves JSONC comments in wrangler.jsonc', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `// Top comment
{
  // Inner comment
  "name": "my-worker",
  "main": "src/index.ts"
}
`
      );
      await bindingGenerator(tree, {
        project: 'w',
        type: 'kv',
        binding: 'MY_KV',
        id: 'abc',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('// Top comment');
      expect(config).toContain('// Inner comment');
      expect(config).toContain('"kv_namespaces"');
    });
  });

  describe('Durable Objects', () => {
    it('writes a DO binding + migration + class stub + re-export', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'do',
        binding: 'MY_DO',
        name: 'MyDurableObject',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"durable_objects"');
      expect(config).toContain('"class_name": "MyDurableObject"');
      expect(config).toContain('"migrations"');
      expect(config).toContain('"tag": "v1"');
      expect(config).toContain('"new_sqlite_classes"');

      expect(tree.exists('apps/w/src/my-durable-object.ts')).toBe(true);
      const stub = tree.read('apps/w/src/my-durable-object.ts', 'utf-8')!;
      // The base class is exported from cloudflare:workers (not a global), so
      // the stub must import it or it won't type-check.
      expect(stub).toContain(
        "import { DurableObject } from 'cloudflare:workers'"
      );
      expect(stub).toContain(
        'export class MyDurableObject extends DurableObject<Env>'
      );

      const index = tree.read('apps/w/src/index.ts', 'utf-8')!;
      expect(index).toContain("export * from './my-durable-object'");
    });

    it('increments the migration tag for subsequent DO bindings', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `{
  "name": "w",
  "main": "src/index.ts",
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["ExistingDO"] }]
}`
      );
      await bindingGenerator(tree, {
        project: 'w',
        type: 'do',
        binding: 'SECOND_DO',
        name: 'SecondDurableObject',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"tag": "v2"');
    });
  });

  describe('Workflows', () => {
    it('writes a Workflow binding + class stub + re-export', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'workflow',
        binding: 'MY_WORKFLOW',
        name: 'MyWorkflow',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"workflows"');
      expect(config).toContain('"class_name": "MyWorkflow"');

      expect(tree.exists('apps/w/src/my-workflow.ts')).toBe(true);
      const stub = tree.read('apps/w/src/my-workflow.ts', 'utf-8')!;
      expect(stub).toContain('WorkflowEntrypoint');
      expect(stub).toContain('export class MyWorkflow');

      const index = tree.read('apps/w/src/index.ts', 'utf-8')!;
      expect(index).toContain("export * from './my-workflow'");
    });
  });

  describe('Queues', () => {
    it('writes producer + consumer config and injects a queue handler', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'queue',
        binding: 'MY_QUEUE',
        name: 'my-queue',
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"queues"');
      expect(config).toContain('"producers"');
      expect(config).toContain('"queue": "my-queue"');
      expect(config).toContain('"consumers"');

      const index = tree.read('apps/w/src/index.ts', 'utf-8')!;
      expect(index).toContain('async queue(');
      expect(index).toContain('MessageBatch<unknown>');
      expect(index).toContain('ctx: ExecutionContext');
    });

    it('preserves the existing fetch handler when adding queue', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'queue',
        binding: 'MY_QUEUE',
        name: 'my-queue',
        skipTypegen: true,
      });

      const updated = tree.read('apps/w/src/index.ts', 'utf-8')!;
      expect(updated).toContain('async fetch');
      expect(updated).toContain('async queue');
    });

    it('inserts before the real closing brace when a string literal contains "}"', async () => {
      seedWorker(tree, 'apps/w', 'w');
      // A `}` inside the returned string must not be mistaken for the end of
      // the default-export object by the brace matcher.
      tree.write(
        'apps/w/src/index.ts',
        `export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('}{ tricky }');
  },
};
`
      );
      await bindingGenerator(tree, {
        project: 'w',
        type: 'queue',
        binding: 'MY_QUEUE',
        name: 'my-queue',
        skipTypegen: true,
      });

      const index = tree.read('apps/w/src/index.ts', 'utf-8')!;
      expect(index).toContain("return new Response('}{ tricky }');");
      expect(index).toContain('async queue(');
      // The handler must land inside the object, before its final `}`.
      expect(index.indexOf('async queue(')).toBeLessThan(
        index.lastIndexOf('}')
      );
    });

    // The brace matcher skips `}` inside line comments, block comments, and
    // template literals. If any branch regressed, the matcher would either stop
    // early (no handler injected) or corrupt the distinctive token.
    it.each([
      {
        label: 'line comment',
        body: `    // a stray brace } in a comment\n    return new Response('ok');`,
        token: '// a stray brace } in a comment',
      },
      {
        label: 'block comment',
        body: `    /* a stray brace } here */\n    return new Response('ok');`,
        token: '/* a stray brace } here */',
      },
      {
        label: 'template literal interpolation',
        body: '    return new Response(`value: ${1 + 1} }`);',
        token: 'value: ${1 + 1} }',
      },
    ])(
      'injects the queue handler past a "}" inside a $label',
      async ({ body, token }) => {
        seedWorker(tree, 'apps/w', 'w');
        tree.write(
          'apps/w/src/index.ts',
          `export default {
  async fetch(request: Request, env: Env): Promise<Response> {
${body}
  },
};
`
        );
        await bindingGenerator(tree, {
          project: 'w',
          type: 'queue',
          binding: 'MY_QUEUE',
          name: 'my-queue',
          skipTypegen: true,
        });

        const index = tree.read('apps/w/src/index.ts', 'utf-8')!;
        // Handler injected (matcher found the real closing brace, not the one
        // hidden in the comment/template) and the distinctive token survived.
        expect(index).toContain('async queue(');
        expect(index).toContain('async fetch');
        expect(index).toContain(token);
        expect(index.indexOf('async queue(')).toBeLessThan(
          index.lastIndexOf('}')
        );
      }
    );

    it('leaves the entrypoint untouched when there is no default export object', async () => {
      seedWorker(tree, 'apps/w', 'w');
      // A class-style entrypoint has no `export default { ... }` to inject into.
      const entry = `import { WorkerEntrypoint } from 'cloudflare:workers';

export default class extends WorkerEntrypoint<Env> {
  async fetch(): Promise<Response> {
    return new Response('ok');
  }
}
`;
      tree.write('apps/w/src/index.ts', entry);
      await bindingGenerator(tree, {
        project: 'w',
        type: 'queue',
        binding: 'MY_QUEUE',
        name: 'my-queue',
        skipTypegen: true,
      });

      // No handler is injected (the generator warns instead of corrupting the
      // file), but the queue is still wired in config.
      expect(tree.read('apps/w/src/index.ts', 'utf-8')!).toBe(entry);
      expect(tree.read('apps/w/wrangler.jsonc', 'utf-8')!).toContain(
        '"consumers"'
      );
    });

    it('does not duplicate the queue handler on a second queue binding', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'queue',
        binding: 'FIRST_QUEUE',
        name: 'first-queue',
        skipTypegen: true,
      });
      await bindingGenerator(tree, {
        project: 'w',
        type: 'queue',
        binding: 'SECOND_QUEUE',
        name: 'second-queue',
        skipTypegen: true,
      });

      const index = tree.read('apps/w/src/index.ts', 'utf-8')!;
      const queueCount = (index.match(/async\s+queue\s*\(/g) ?? []).length;
      expect(queueCount).toBe(1);
    });
  });

  describe('test stubs', () => {
    it('emits a spec for DO bindings', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'do',
        binding: 'MY_DO',
        name: 'MyDurableObject',
        skipTypegen: true,
      });

      expect(tree.exists('apps/w/src/my-durable-object.spec.ts')).toBe(true);
      const spec = tree.read('apps/w/src/my-durable-object.spec.ts', 'utf-8')!;
      expect(spec).toContain('import { MyDurableObject }');
      expect(spec).toContain('env.MY_DO');
    });

    it('skips tests when --skipTests', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'do',
        binding: 'MY_DO',
        name: 'MyDurableObject',
        skipTests: true,
        skipTypegen: true,
      });

      expect(tree.exists('apps/w/src/my-durable-object.spec.ts')).toBe(false);
    });

    it('emits no spec for config-only types (KV/R2/D1/Service)', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'kv',
        binding: 'MY_KV',
        id: 'abc',
        skipTypegen: true,
      });

      // No spec file should be created for a config-only binding
      const files = tree.listChanges().map((c) => c.path);
      expect(files.some((f) => f.endsWith('.spec.ts'))).toBe(false);
    });
  });

  describe('idempotency', () => {
    it('errors on duplicate KV binding name', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `{
  "name": "w",
  "main": "src/index.ts",
  "kv_namespaces": [{ "binding": "MY_KV", "id": "existing" }]
}`
      );

      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'kv',
          binding: 'MY_KV',
          id: 'new',
          skipTypegen: true,
        })
      ).rejects.toThrow('already exists');
    });

    it('errors on duplicate DO binding name', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `{
  "name": "w",
  "main": "src/index.ts",
  "durable_objects": {
    "bindings": [{ "name": "MY_DO", "class_name": "ExistingDO" }]
  }
}`
      );

      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'do',
          binding: 'MY_DO',
          name: 'NewDO',
          skipTypegen: true,
        })
      ).rejects.toThrow('already exists');
    });

    it('errors when the DO class_name is already defined by a migration', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `{
  "name": "w",
  "main": "src/index.ts",
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["MyDurableObject"] }]
}`
      );

      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'do',
          binding: 'ANOTHER_DO',
          name: 'MyDurableObject',
          skipTypegen: true,
        })
      ).rejects.toThrow('already defined');
    });

    it('errors when the DO class_name is already used by another binding', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `{
  "name": "w",
  "main": "src/index.ts",
  "durable_objects": {
    "bindings": [{ "name": "EXISTING_DO", "class_name": "MyDurableObject" }]
  }
}`
      );

      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'do',
          binding: 'ANOTHER_DO',
          name: 'MyDurableObject',
          skipTypegen: true,
        })
      ).rejects.toThrow('already defined');
    });

    it('errors on duplicate Workflow binding name', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `{
  "name": "w",
  "main": "src/index.ts",
  "workflows": [{ "binding": "MY_WORKFLOW", "name": "my-workflow", "class_name": "MyWorkflow" }]
}`
      );

      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'workflow',
          binding: 'MY_WORKFLOW',
          name: 'AnotherWorkflow',
          skipTypegen: true,
        })
      ).rejects.toThrow('already exists');
    });

    it('errors on duplicate Service binding name', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.write(
        'apps/w/wrangler.jsonc',
        `{
  "name": "w",
  "main": "src/index.ts",
  "services": [{ "binding": "AUTH", "service": "auth-worker" }]
}`
      );

      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'service',
          binding: 'AUTH',
          name: 'other-worker',
          skipTypegen: true,
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('validation', () => {
    it('errors when --create is used with a non-provisionable type', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'do',
          binding: 'MY_DO',
          name: 'MyDO',
          create: true,
          skipTypegen: true,
        })
      ).rejects.toThrow('`--create` is not supported');
    });

    it('errors when --name is missing for DO', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'do',
          binding: 'MY_DO',
          skipTypegen: true,
        } as never)
      ).rejects.toThrow('`--name` is required');
    });

    it('errors when --bucketName is missing for R2 without --create', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'r2',
          binding: 'MY_BUCKET',
          skipTypegen: true,
        } as never)
      ).rejects.toThrow('`--bucketName` is required');
    });

    it('errors when --databaseName is missing for D1 without --create', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'd1',
          binding: 'MY_DB',
          skipTypegen: true,
        } as never)
      ).rejects.toThrow('`--databaseName` is required');
    });

    it.each(['workflow', 'queue', 'service'] as const)(
      'errors when --name is missing for %s',
      async (type) => {
        seedWorker(tree, 'apps/w', 'w');
        await expect(
          bindingGenerator(tree, {
            project: 'w',
            type,
            binding: 'MY_BINDING',
            skipTypegen: true,
          } as never)
        ).rejects.toThrow('`--name` is required');
      }
    );

    it('errors when the project does not exist', async () => {
      await expect(
        bindingGenerator(tree, {
          project: 'no-such-project',
          type: 'kv',
          binding: 'MY_KV',
          skipTypegen: true,
        })
      ).rejects.toThrow('not found');
    });

    it('errors when wrangler.toml is used (jsonc/json only)', async () => {
      seedWorker(tree, 'apps/w', 'w');
      tree.delete('apps/w/wrangler.jsonc');
      tree.write('apps/w/wrangler.toml', 'name = "w"\nmain = "src/index.ts"\n');

      await expect(
        bindingGenerator(tree, {
          project: 'w',
          type: 'kv',
          binding: 'MY_KV',
          skipTypegen: true,
        })
      ).rejects.toThrow('wrangler.jsonc');
    });
  });

  describe('callback (post-flush)', () => {
    it('auto-runs wrangler types by default', async () => {
      seedWorker(tree, 'apps/w', 'w');
      const cb = await bindingGenerator(tree, {
        project: 'w',
        type: 'kv',
        binding: 'MY_KV',
        id: 'abc',
      });
      await cb();
      expect(runWranglerTypesMock).toHaveBeenCalledTimes(1);
    });

    it('skips typegen when --skipTypegen', async () => {
      seedWorker(tree, 'apps/w', 'w');
      const cb = await bindingGenerator(tree, {
        project: 'w',
        type: 'kv',
        binding: 'MY_KV',
        id: 'abc',
        skipTypegen: true,
      });
      await cb();
      expect(runWranglerTypesMock).not.toHaveBeenCalled();
    });

    it('provisions the resource when --create is set', async () => {
      seedWorker(tree, 'apps/w', 'w');
      const cb = await bindingGenerator(tree, {
        project: 'w',
        type: 'kv',
        binding: 'MY_KV',
        create: true,
        skipTypegen: true,
      });
      await cb();
      expect(provisionResourceMock).toHaveBeenCalledTimes(1);
    });

    it('writes the bucket name directly for R2 --create (no sentinel)', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'r2',
        binding: 'MY_BUCKET',
        create: true,
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).not.toContain('__PENDING_CREATE__');
      expect(config).toContain('"bucket_name": "my-bucket"');
    });

    it('writes the database name directly for D1 --create (sentinel only in database_id)', async () => {
      seedWorker(tree, 'apps/w', 'w');
      await bindingGenerator(tree, {
        project: 'w',
        type: 'd1',
        binding: 'MY_DB',
        create: true,
        skipTypegen: true,
      });

      const config = tree.read('apps/w/wrangler.jsonc', 'utf-8')!;
      expect(config).toContain('"database_name": "my-db"');
      expect(config).toContain('__PENDING_CREATE__');
      // The sentinel should appear only once (in database_id), not in database_name
      const sentinelCount = (config.match(/__PENDING_CREATE__/g) ?? []).length;
      expect(sentinelCount).toBe(1);
    });
  });
});
