import { tmpProjPath } from '@nx/plugin/testing';
import { ChildProcess, exec, execSync } from 'child_process';
import { dirname } from 'path';
import { logError, stripConsoleColors } from './log-utils';

export function runNxCommandWithNpx(command: string, cwd?: string): string {
  const localTmpDir = dirname(tmpProjPath());
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

export function runCommandUntil(
  command: string,
  criteria: (output: string) => boolean
): Promise<ChildProcess> {
  const localTmpDir = dirname(tmpProjPath());
  const p = exec(`npx nx ${command}`, {
    cwd: localTmpDir,
    encoding: 'utf-8',
    env: {
      CI: 'true',
      FORCE_COLOR: 'false',
    },
  });

  return new Promise((res, rej) => {
    let output = '';
    let complete = false;

    function checkCriteria(c) {
      output += c.toString();
      if (criteria(stripConsoleColors(output)) && !complete) {
        complete = true;
        res(p);
      }
    }

    p.stdout?.on('data', checkCriteria);
    p.stderr?.on('data', checkCriteria);
    p.on('exit', (code) => {
      if (!complete) {
        logError(
          `Original output:`,
          output
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n')
        );
        rej(`Exited with ${code}`);
      } else {
        res(p);
      }
    });
  });
}
