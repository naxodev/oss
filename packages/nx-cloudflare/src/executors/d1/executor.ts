import { join } from 'node:path';
import { logger, type ExecutorContext } from '@nx/devkit';
import { runWrangler } from '../../utils/run-wrangler';
import type { D1ExecutorSchema } from './schema';

// Pure: resolve the target database_name from the baked binding -> name map.
// `db` selects a binding and is optional only when there is exactly one
// database; an unknown binding, or ambiguity with no `db`, throws a message
// that names the valid bindings.
export function resolveDatabase(
  databases: Record<string, string>,
  db?: string
): string {
  const bindings = Object.keys(databases);
  if (db !== undefined) {
    const name = databases[db];
    if (name === undefined) {
      throw new Error(`Unknown --db=${db}. Valid: ${bindings.join(', ')}`);
    }
    return name;
  }
  if (bindings.length === 1) {
    return databases[bindings[0]];
  }
  throw new Error(
    `This Worker has ${bindings.length} D1 databases (${bindings.join(
      ', '
    )}); pass --db=<binding>.`
  );
}

// Pure: build the `wrangler d1 migrations <command>` argv against an already
// resolved database name. `apply`/`list` always pass an explicit
// `--local`/`--remote` (defaulting to local) so the target is unambiguous
// regardless of wrangler's evolving default. `create` writes a migration file
// locally only, so `--remote`/`--local` do not apply and `--env` is omitted —
// migration files are environment-agnostic.
export function buildD1Args(
  options: D1ExecutorSchema,
  database: string
): string[] {
  const { command, remote, env, message } = options;
  if (command === 'create') {
    if (!message) {
      throw new Error(
        'The `message` option is required for `d1 migrations create`.'
      );
    }
    return ['d1', 'migrations', 'create', database, message];
  }
  const args = [
    'd1',
    'migrations',
    command,
    database,
    remote ? '--remote' : '--local',
  ];
  if (env) {
    args.push('--env', env);
  }
  return args;
}

export default async function d1Executor(
  options: D1ExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  if (!context.projectName) {
    logger.error('d1 executor: no project in context.');
    return { success: false };
  }
  try {
    const database = resolveDatabase(options.databases, options.db);
    const projectRoot =
      context.projectsConfigurations.projects[context.projectName].root;
    return {
      success: runWrangler(
        buildD1Args(options, database),
        join(context.root, projectRoot)
      ),
    };
  } catch (e) {
    logger.error(e instanceof Error ? e.message : String(e));
    return { success: false };
  }
}
