import {
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  logger,
  names,
  Tree,
  workspaceRoot,
} from '@nx/devkit';
import { join } from 'node:path';
import type { JSONPath } from 'jsonc-parser';
import type { NormalizedSchema, Schema } from './schema';
import {
  appendToArray,
  assertJsoncConfig,
  findInArray,
  findWranglerConfig,
  getMigrationCount,
  migrationDefinesClass,
  readWranglerConfig,
} from '../../utils/wrangler-config';
import { runWrangler } from '../../utils/run-wrangler';
import {
  PROVISION_SENTINEL,
  provisionResource,
  type ProvisionableType,
} from '../../utils/provision';
import { resolveProjectRootOrThrow } from '../../utils/project';
import { addQueueHandler } from './entrypoint-editor';

const PROVISIONABLE_TYPES: ReadonlySet<ProvisionableType> = new Set([
  'kv',
  'r2',
  'd1',
  'queue',
]);

export async function bindingGenerator(
  tree: Tree,
  schema: Schema
): Promise<GeneratorCallback> {
  const options = await normalizeOptions(tree, schema);
  const config = readWranglerConfig(tree, options.configPath);

  assertNoDuplicateBinding(config, options);

  writeBindingConfig(tree, options);
  writeCodeStubs(tree, options);

  if (!options.skipTests) {
    writeTestStub(tree, options);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return async () => {
    if (options.create) {
      // Throws on failure (fail loud): --create was explicitly requested, so a
      // failed provision must surface rather than leave a green run over a
      // config that references a resource which was never created.
      provisionResource({
        type: options.type as ProvisionableType,
        binding: options.binding,
        name: provisionName(options),
        projectRoot: options.projectRoot,
        configPath: options.configPath,
      });
    }
    if (!options.skipTypegen) {
      const result = runWrangler(
        ['types'],
        join(workspaceRoot, options.projectRoot)
      );
      if (!result.success) {
        logger.warn(
          `binding: \`wrangler types\` failed — run \`nx typegen ${options.project}\` manually. ` +
            `Reason: ${result.reason}`
        );
      }
    }
  };
}

async function normalizeOptions(
  tree: Tree,
  schema: Schema
): Promise<NormalizedSchema> {
  const projectRoot = await resolveProjectRootOrThrow(tree, schema.project);

  const configPath = findWranglerConfig(tree, projectRoot);
  if (!configPath) {
    throw new Error(
      `No wrangler.{jsonc,json,toml} found in ${projectRoot}. ` +
        `The binding generator targets an existing Worker project. ` +
        `Run \`nx g @naxodev/nx-cloudflare:application\` first.`
    );
  }
  assertJsoncConfig(configPath, 'The binding generator');

  validateTypeSpecificOptions(schema);

  const className =
    schema.type === 'do' || schema.type === 'workflow' ? schema.name ?? '' : '';
  const fileName =
    className.length > 0
      ? names(className).fileName
      : schema.type === 'queue'
      ? names(schema.name ?? '').fileName
      : '';

  return {
    ...schema,
    projectRoot,
    configPath,
    className,
    fileName,
    queueName: schema.type === 'queue' ? schema.name ?? '' : '',
    serviceName: schema.type === 'service' ? schema.name ?? '' : '',
  };
}

function validateTypeSpecificOptions(schema: Schema): void {
  if ((schema.type === 'do' || schema.type === 'workflow') && !schema.name) {
    throw new Error(
      `\`--name\` is required for type "${schema.type}" ` +
        `(the exported class name, PascalCase).`
    );
  }
  if (schema.type === 'queue' && !schema.name) {
    throw new Error(
      `\`--name\` is required for type "queue" (the queue name).`
    );
  }
  if (schema.type === 'service' && !schema.name) {
    throw new Error(
      `\`--name\` is required for type "service" (the target service name).`
    );
  }
  if (schema.type === 'r2' && !schema.create && !schema.bucketName) {
    throw new Error(
      `\`--bucketName\` is required for type "r2" (or pass --create to provision one).`
    );
  }
  if (schema.type === 'd1' && !schema.create && !schema.databaseName) {
    throw new Error(
      `\`--databaseName\` is required for type "d1" (or pass --create to provision one).`
    );
  }
  if (
    schema.create &&
    !PROVISIONABLE_TYPES.has(schema.type as ProvisionableType)
  ) {
    throw new Error(
      `\`--create\` is not supported for type "${schema.type}". ` +
        `Durable Objects, Workflows, and Service bindings are not provisioned resources — ` +
        `they are code in your Worker (do/workflow) or a reference to another Worker (service). ` +
        `Drop --create and re-run.`
    );
  }
}

function assertNoDuplicateBinding(
  config: Record<string, unknown>,
  options: NormalizedSchema
): void {
  const { type, binding, name } = options;
  const checks: { path: JSONPath; field: string; value: string }[] = [];

  switch (type) {
    case 'kv':
      checks.push({
        path: ['kv_namespaces'],
        field: 'binding',
        value: binding,
      });
      break;
    case 'r2':
      checks.push({ path: ['r2_buckets'], field: 'binding', value: binding });
      break;
    case 'd1':
      checks.push({ path: ['d1_databases'], field: 'binding', value: binding });
      break;
    case 'workflow':
      checks.push({ path: ['workflows'], field: 'binding', value: binding });
      break;
    case 'service':
      checks.push({ path: ['services'], field: 'binding', value: binding });
      break;
    case 'do': {
      const doBindingsPath: JSONPath = ['durable_objects', 'bindings'];
      if (findInArray(config, doBindingsPath, 'name', binding)) {
        throw new Error(
          `A Durable Object binding named "${binding}" already exists in wrangler.jsonc. ` +
            `Use a different --binding or remove the existing entry.`
        );
      }
      // A class can only be introduced by a single migration; reusing a
      // class_name that already exists (in a binding or a prior migration)
      // would emit a duplicate `new_sqlite_classes` entry that wrangler rejects.
      const classClash =
        findInArray(config, doBindingsPath, 'class_name', options.className) ||
        migrationDefinesClass(config, options.className);
      if (classClash) {
        throw new Error(
          `A Durable Object class "${options.className}" is already defined in wrangler.jsonc ` +
            `(as a binding or in a migration). Use a different --name.`
        );
      }
      return;
    }
    case 'queue': {
      if (findInArray(config, ['queues', 'producers'], 'binding', binding)) {
        throw new Error(
          `A queue producer with binding "${binding}" already exists in wrangler.jsonc.`
        );
      }
      if (findInArray(config, ['queues', 'consumers'], 'queue', name)) {
        throw new Error(
          `A queue consumer for queue "${name}" already exists in wrangler.jsonc.`
        );
      }
      return;
    }
  }

  for (const { path, field, value } of checks) {
    if (findInArray(config, path, field, value)) {
      throw new Error(
        `Binding "${value}" already exists in wrangler.jsonc ` +
          `(${field} on ${path[0]}). Use a different --binding or remove the existing entry.`
      );
    }
  }
}

function writeBindingConfig(tree: Tree, options: NormalizedSchema): void {
  const { type, binding, configPath } = options;

  switch (type) {
    case 'kv':
      appendToArray(tree, configPath, ['kv_namespaces'], {
        binding,
        id: options.id ?? placeholderOrSentinel(options),
      });
      break;
    case 'r2':
      appendToArray(tree, configPath, ['r2_buckets'], {
        binding,
        bucket_name: options.bucketName ?? nameOrPlaceholder(options),
      });
      break;
    case 'd1':
      appendToArray(tree, configPath, ['d1_databases'], {
        binding,
        database_name: options.databaseName ?? nameOrPlaceholder(options),
        database_id: options.id ?? placeholderOrSentinel(options),
      });
      break;
    case 'do':
      appendToArray(tree, configPath, ['durable_objects', 'bindings'], {
        name: binding,
        class_name: options.className,
      });
      appendDurableObjectMigration(tree, options);
      break;
    case 'queue':
      appendToArray(tree, configPath, ['queues', 'producers'], {
        binding,
        queue: options.queueName,
      });
      appendToArray(tree, configPath, ['queues', 'consumers'], {
        queue: options.queueName,
      });
      break;
    case 'workflow':
      appendToArray(tree, configPath, ['workflows'], {
        binding,
        name: kebabCase(options.className),
        class_name: options.className,
      });
      break;
    case 'service':
      appendToArray(tree, configPath, ['services'], {
        binding,
        service: options.serviceName,
      });
      break;
  }
}

function placeholderOrSentinel(options: NormalizedSchema): string {
  return options.create ? PROVISION_SENTINEL : 'PLACEHOLDER_FILL_ME_IN';
}

// For name-like fields (bucket_name, database_name) the value is known before
// provisioning — it is the binding name in lowercase-hyphen form, or a
// user-provided name. The sentinel is only for id fields that are captured
// from `wrangler <x> create` stdout.
function nameOrPlaceholder(options: NormalizedSchema): string {
  if (options.create) {
    return provisionName(options);
  }
  return 'PLACEHOLDER_FILL_ME_IN';
}

function appendDurableObjectMigration(
  tree: Tree,
  options: NormalizedSchema
): void {
  const config = readWranglerConfig(tree, options.configPath);
  const count = getMigrationCount(config);
  appendToArray(tree, options.configPath, ['migrations'], {
    tag: `v${count + 1}`,
    new_sqlite_classes: [options.className],
  });
}

function writeCodeStubs(tree: Tree, options: NormalizedSchema): void {
  switch (options.type) {
    case 'do':
      writeDurableObjectStub(tree, options);
      break;
    case 'workflow':
      writeWorkflowStub(tree, options);
      break;
    case 'queue':
      writeQueueHandler(tree, options);
      break;
    default:
      return;
  }
}

function writeDurableObjectStub(tree: Tree, options: NormalizedSchema): void {
  const filePath = joinPathFragments(
    options.projectRoot,
    'src',
    `${options.fileName}.ts`
  );
  tree.write(
    filePath,
    `import { DurableObject } from 'cloudflare:workers';

export class ${options.className} extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
}
`
  );
  appendReExport(tree, options, `./${options.fileName}`);
}

function writeWorkflowStub(tree: Tree, options: NormalizedSchema): void {
  const filePath = joinPathFragments(
    options.projectRoot,
    'src',
    `${options.fileName}.ts`
  );
  tree.write(
    filePath,
    `import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workflows';

type Params = Record<string, unknown>;

export class ${options.className} extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    await step.do('first step', async () => {
      return { started: true };
    });
  }
}
`
  );
  appendReExport(tree, options, `./${options.fileName}`);
}

// Insert the `queue(batch, env)` method into the existing default export
// object in `src/index.ts`. If no default export object exists, warn. If a
// queue handler already exists (from a prior binding), skip — a Worker has
// one queue() handler that receives from all queue bindings. The actual text
// splice (finding the default export's closing brace, string/comment-aware)
// lives in entrypoint-editor.ts, kept pure and unit-tested separately.
function writeQueueHandler(tree: Tree, options: NormalizedSchema): void {
  const entryPath = joinPathFragments(options.projectRoot, 'src/index.ts');
  const existing = tree.exists(entryPath)
    ? tree.read(entryPath, 'utf-8') ?? ''
    : '';

  const method = `  async queue(batch: MessageBatch<unknown>, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      // TODO: process message
      message.ack();
    }
  },`;

  const outcome = addQueueHandler(existing, method);
  switch (outcome.status) {
    case 'already-present':
      logger.info(
        `binding: a \`queue()\` handler already exists in ${entryPath} — leaving it untouched. ` +
          `A Worker has a single queue() handler that receives batches from all queue ` +
          `consumers; the new consumer is wired in wrangler.jsonc and will be delivered to it.`
      );
      return;
    case 'no-default-export':
      logger.warn(
        `binding: ${entryPath} has no \`export default { ... }\` object. ` +
          `Add this method to your entrypoint manually:\n${method}\n`
      );
      return;
    case 'no-closing-brace':
      logger.warn(
        `binding: could not find the closing \`}\` of the default export in ${entryPath}. ` +
          `Add this method manually:\n${method}\n`
      );
      return;
    case 'inserted':
      tree.write(entryPath, outcome.source);
      return;
  }
}

function appendReExport(
  tree: Tree,
  options: NormalizedSchema,
  relativePath: string
): void {
  const entryPath = joinPathFragments(options.projectRoot, 'src/index.ts');
  const existing = tree.exists(entryPath)
    ? tree.read(entryPath, 'utf-8') ?? ''
    : '';
  const line = `export * from '${relativePath}';\n`;
  if (existing.includes(`export * from '${relativePath}'`)) {
    return;
  }
  const prefix = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  tree.write(entryPath, `${existing}${prefix}${line}`);
}

function writeTestStub(tree: Tree, options: NormalizedSchema): void {
  if (
    options.type !== 'do' &&
    options.type !== 'workflow' &&
    options.type !== 'queue'
  ) {
    return;
  }

  const srcRoot = joinPathFragments(options.projectRoot, 'src');
  const specPath = joinPathFragments(srcRoot, `${options.fileName}.spec.ts`);

  const importLine =
    options.type === 'queue'
      ? ''
      : `import { ${options.className} } from './${options.fileName}';\n`;

  const content = `import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
${importLine}
describe('${options.binding}', () => {
  it('is bound in the test env', () => {
    expect(env.${options.binding}).toBeDefined();
  });
});
`;
  tree.write(specPath, content);
}

function provisionName(options: NormalizedSchema): string {
  switch (options.type) {
    case 'r2':
      return (
        options.bucketName ?? options.binding.toLowerCase().replace(/_/g, '-')
      );
    case 'd1':
      return (
        options.databaseName ?? options.binding.toLowerCase().replace(/_/g, '-')
      );
    case 'queue':
      return options.queueName;
    default:
      return options.binding;
  }
}

function kebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

export default bindingGenerator;
