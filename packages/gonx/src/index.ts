import { NxPlugin } from '@nx/devkit';
import { createDependencies } from './graph/create-dependencies';
import { createNodes, createNodesV2 } from './graph/createNodes';

const nxPlugin: NxPlugin = {
  name: '@naxodev/gonx',
  createDependencies,
  createNodes,
  createNodesV2,
};

export = nxPlugin;
