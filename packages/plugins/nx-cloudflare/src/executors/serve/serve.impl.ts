import { ExecutorContext } from '@nx/devkit';
import { Schema } from './schema';
import { fork } from 'child_process';
import { createAsyncIterable } from '@nx/devkit/src/utils/async-iterable';
import { waitForPortOpen } from '@nx/web/src/utils/wait-for-port-open';

export default async function* serveExecutor(
  options: Schema,
  context: ExecutorContext
) {
  const projectRoot =
    context.projectsConfigurations.projects[context.projectName].root;

  const wranglerOptions = [];

  if (options.port) {
    wranglerOptions.push(`--port=${options.port}`);
  }

  console.log('starting server');

  const wranglerBin = require.resolve('wranger/dist/bin/wrangler');

  yield* createAsyncIterable<{ success: boolean; baseUrl: string }>(
    async ({ done, next, error }) => {
      const server = fork(wranglerBin, ['dev', ...wranglerOptions], {
        cwd: projectRoot,
        stdio: 'inherit',
      });
      console.log('enter here 1');

      server.once('exit', (code) => {
        console.log('enter here 2');
        if (code === 0) {
          done();
        } else {
          error(new Error(`Cloudflare worker exited with code ${code}`));
        }
      });

      const killServer = () => {
        if (server.connected) {
          server.kill('SIGTERM');
        }
      };

      process.on('exit', () => killServer());
      process.on('SIGINT', () => killServer());
      process.on('SIGTERM', () => killServer());
      process.on('SIGHUP', () => killServer());

      console.log('enter here 3');

      await waitForPortOpen(options.port);

      next({
        success: true,
        baseUrl: `http://localhost:${options.port}`,
      });
    }
  );
}