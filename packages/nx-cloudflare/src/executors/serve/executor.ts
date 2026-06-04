import { ExecutorContext } from '@nx/devkit';
import { ServeSchema } from './schema';
import { spawn } from 'child_process';
import { createAsyncIterable } from '@nx/devkit/src/utils/async-iterable';
import { waitForPortOpen } from '@nx/web/src/utils/wait-for-port-open';
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

      await waitForPortOpen(options.port);

      next({
        success: true,
        baseUrl: `http://localhost:${options.port}`,
      });
    }
  );
}
