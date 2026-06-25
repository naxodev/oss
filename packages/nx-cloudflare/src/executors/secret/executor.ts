import { join } from 'node:path';
import { logger, type ExecutorContext } from '@nx/devkit';
import { runWrangler } from '../../utils/run-wrangler';
import type { SecretExecutorSchema } from './schema';

// Pure: build the `wrangler secret <command>` argv. `put`/`delete` take only
// the KEY (never the value — wrangler prompts for it); `bulk` takes a JSON
// file; `list` takes no positional. Secret values are never passed as args.
export function buildSecretArgs(options: SecretExecutorSchema): string[] {
  const { command, name, file, env } = options;
  const args = ['secret', command];
  switch (command) {
    case 'put':
    case 'delete':
      if (!name) {
        throw new Error(
          `The \`name\` option is required for \`secret ${command}\`.`
        );
      }
      args.push(name);
      break;
    case 'bulk':
      if (!file) {
        throw new Error('The `file` option is required for `secret bulk`.');
      }
      args.push(file);
      break;
    case 'list':
      break;
  }
  if (env) {
    args.push('--env', env);
  }
  return args;
}

export default async function secretExecutor(
  options: SecretExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  if (!context.projectName) {
    logger.error('secret executor: no project in context.');
    return { success: false };
  }
  const projectRoot =
    context.projectsConfigurations.projects[context.projectName].root;
  try {
    return {
      success: runWrangler(
        buildSecretArgs(options),
        join(context.root, projectRoot)
      ),
    };
  } catch (e) {
    logger.error(e instanceof Error ? e.message : String(e));
    return { success: false };
  }
}
