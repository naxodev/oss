import { PromiseExecutor } from '@nx/devkit';
import { TidyExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<TidyExecutorSchema> = async (options) => {
  console.log('Executor ran for Tidy', options);
  return {
    success: true,
  };
};

export default runExecutor;
