import { tmpProjPath } from '@nx/plugin/testing';
import { execSync } from 'child_process';
import { join } from 'path';

export function runNxCommandWithNpx(command: string, cwd?: string): string {
  const localTmpDir = join(tmpProjPath());
  console.log('localTmpDir', localTmpDir);
  return execSync(`npx nx ${command}`, {
    cwd: cwd ?? localTmpDir,
    stdio: 'inherit',
    env: process.env,
  })
    ?.toString()
    ?.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );
}
