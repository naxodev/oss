import { ExecutorContext } from '@nx/devkit';
import { ServeSchema } from './schema';
import { spawn } from 'child_process';
import { createAsyncIterable } from '@nx/devkit/src/utils/async-iterable';
import { waitForPortOpen } from '../../utils/wait-for-port-open';
import { createCliOptions } from '../../utils/create-cli-options';
import { getProjectCwd } from '../../utils/project-paths';
import { resolveWranglerBin } from '../../utils/wrangler';

export default async function* serveExecutor(
  options: ServeSchema,
  context: ExecutorContext
) {
  const cwd = getProjectCwd(context);

  const wranglerOptions = createCliOptions({ ...options });

  const wranglerBin = resolveWranglerBin();

  yield* createAsyncIterable<{ success: boolean; baseUrl: string }>(
    async ({ done, next, error }) => {
      const server = spawn(
        process.execPath,
        [wranglerBin, 'dev', ...wranglerOptions],
        {
          cwd,
          stdio: 'inherit',
        }
      );

      // Surface a failed spawn instead of letting the 'error' event throw
      // uncaught (and hang the dev server task).
      server.once('error', (err) => {
        error(
          new Error(`Failed to start the Cloudflare worker: ${err.message}`)
        );
      });

      server.once('exit', (code) => {
        if (code === 0) {
          done();
        } else {
          error(new Error(`Cloudflare worker exited with code ${code}`));
        }
      });

      const killServer = () => {
        if (!server.killed) {
          server.kill('SIGTERM');
        }
      };

      process.on('exit', () => killServer());
      process.on('SIGINT', () => killServer());
      process.on('SIGTERM', () => killServer());
      process.on('SIGHUP', () => killServer());

      // createAsyncIterable invokes this listener fire-and-forget, so a
      // rejection here would surface as an unhandled rejection instead of
      // failing the executor. Route it through error() like the spawn paths.
      try {
        await waitForPortOpen(options.port);
      } catch (err) {
        error(
          new Error(
            `Cloudflare worker did not start listening on port ${
              options.port
            }: ${err instanceof Error ? err.message : String(err)}`
          )
        );
        return;
      }

      next({
        success: true,
        baseUrl: `http://localhost:${options.port}`,
      });
    }
  );
}
