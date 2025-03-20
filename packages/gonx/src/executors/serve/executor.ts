import { PromiseExecutor } from '@nx/devkit';
import { ServeExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<ServeExecutorSchema> = async (options) => {
  console.log('Executor ran for Serve', options);
  return {
    success: true,
  };
};

export default runExecutor;
