import { NxPlugin } from '@nx/devkit';
import { createDependencies } from './graph/create-dependencies';
import { createNodesV2 } from './graph/createNodesV2';

const nxPlugin: NxPlugin = {
  name: '@naxodev/gonx',
  createDependencies,
  createNodesV2,
};

export = nxPlugin;
