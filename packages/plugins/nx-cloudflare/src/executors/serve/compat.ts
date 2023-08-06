import { convertNxExecutor } from '@nx/devkit';

import serverExecutor from './serve.impl';

export default convertNxExecutor(serverExecutor);
