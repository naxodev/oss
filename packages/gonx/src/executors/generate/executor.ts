import { PromiseExecutor } from '@nx/devkit';
import { GenerateExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<GenerateExecutorSchema> = async (
  options
) => {
  console.log('Executor ran for Generate', options);
  return {
    success: true,
  };
};

export default runExecutor;
