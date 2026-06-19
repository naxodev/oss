import { NxPlugin } from '@nx/devkit';
import { createDependencies } from './graph/create-dependencies';
import { createNodes } from './graph/createNodes';

const nxPlugin: NxPlugin = {
  name: '@naxodev/gonx',
  createDependencies,
  createNodes,
};

export = nxPlugin;
