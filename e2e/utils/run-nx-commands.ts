import { fileExists, tmpProjPath } from '@nx/plugin/testing';
import { ChildProcess, ExecOptions, exec, execSync } from 'child_process';
import { join } from 'path';
import { logError, stripConsoleColors } from './log-utils';

export function runCommandUntil(
  command: string,
  criteria: (output: string) => boolean
): Promise<ChildProcess> {
  const localTmpDir = join(tmpProjPath());
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
        console.log(stripConsoleColors(output));
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

export function runCommand(
  command: string,
  opts: { env?: NodeJS.ProcessEnv; cwd?: string }
): string {
  try {
    return execSync(command, {
      cwd: opts.cwd ?? tmpProjPath(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...opts?.env },
    }).toString();
  } catch (e) {
    return e.stdout.toString() + e.stderr.toString();
  }
}
