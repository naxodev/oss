import { convertNxExecutor } from '@nx/devkit';

import esbuildExecutor from './publish.impl';

export default convertNxExecutor(esbuildExecutor);
