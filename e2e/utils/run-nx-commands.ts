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

/**
 * Run a nx command inside the e2e directory
 * @param command
 * @param opts
 *
 * @see tmpProjPath
 */
export function runNxCommand(
  command?: string,
  opts: { silenceError?: boolean; env?: NodeJS.ProcessEnv; cwd?: string } = {
    silenceError: false,
  }
): string {
  function _runNxCommand(c) {
    const execSyncOptions: ExecOptions = {
      cwd: opts.cwd ?? tmpProjPath(),
      env: { ...process.env, ...opts.env },
    };
    if (fileExists(tmpProjPath('package.json'))) {
      return execSync(`npx nx ${command}`, execSyncOptions);
    } else if (process.platform === 'win32') {
      return execSync(`./nx.bat %${command}`, execSyncOptions);
    } else {
      return execSync(`./nx %${command}`, execSyncOptions);
    }
  }

  try {
    return _runNxCommand(command)
      .toString()
      .replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
      );
  } catch (e) {
    if (opts.silenceError) {
      return e.stdout.toString();
    } else {
      console.log(e.stdout.toString(), e.stderr.toString());
      throw e;
    }
  }
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
