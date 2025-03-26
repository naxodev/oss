import {
  formatFiles,
  generateFiles,
  Tree,
  updateJson,
  logger,
  readNxJson,
  updateNxJson
} from '@nx/devkit';
import * as path from 'path';
import { InitGeneratorSchema } from './schema';
import { execSync } from 'child_process';

function getGoVersion(): string {
  try {
    const output = execSync('go version').toString();
    const match = output.match(/go(\d+\.\d+)/);
    return match ? match[1] : '1.24'; // Default to 1.24 if not found
  } catch {
    return '1.24'; // Default to 1.24 if go command not found
  }
}

export async function initGenerator(tree: Tree, options: InitGeneratorSchema) {
  logger.info('Initializing Go support for Nx workspace');
  
  // Update nx.json to include the plugin with options
  if (!options.skipWorkspaceJson) {
    const nxJson = readNxJson(tree) || {};
    const hasPlugin = nxJson.plugins?.some((p) => 
      typeof p === 'string' ? p === '@naxodev/gonx' : p.plugin === '@naxodev/gonx'
    );
    
    if (!hasPlugin) {
      if (!nxJson.plugins) {
        nxJson.plugins = [];
      }
      
      nxJson.plugins = [
        ...nxJson.plugins,
        {
          plugin: '@naxodev/gonx',
          options: {
            skipGoDependencyCheck: options.skipGoDependencyCheck || false,
            buildTargetName: 'build',
            serveTargetName: 'serve',
            testTargetName: 'test',
            lintTargetName: 'lint',
            tidyTargetName: 'tidy'
          }
        }
      ];
      
      updateNxJson(tree, nxJson);
      logger.info('Updated nx.json to include the @naxodev/gonx plugin');
    }
  }
  
  // Update package.json
  if (!options.skipPackageJson) {
    updateJson(tree, 'package.json', (json) => {
      if (!json.dependencies) {
        json.dependencies = {};
      }
      
      if (!json.dependencies['@naxodev/gonx']) {
        json.dependencies['@naxodev/gonx'] = '*';
      }
      
      return json;
    });
    
    logger.info('Updated package.json to include @naxodev/gonx dependency');
  }
  
  // Generate files
  const goVersion = getGoVersion();
  
  generateFiles(tree, path.join(__dirname, 'init/files'), '', {
    goVersion,
    multiModule: options.multiModule !== false,
    template: ''
  });
  
  logger.info(`Created Go workspace files (Go ${goVersion})`);
  
  if (options.multiModule !== false) {
    logger.info('Multi-module Go workspace enabled. This requires Go 1.18+');
  }
  
  await formatFiles(tree);
  
  logger.info('Go support successfully initialized!');
}

export default initGenerator;
