import { execSync } from 'child_process';

export { runNxCommandUntil } from './run-commands-until';

export function installPlugin(projectDirectory: string, pluginName: string) {
  // The plugin has been built and published to a local registry in the jest globalSetup
  // Install the plugin built with the latest source code into the test repo
  execSync(`npm install @naxodev/${pluginName}@e2e`, {
    cwd: projectDirectory,
    stdio: 'inherit',
    env: process.env,
  });
}
