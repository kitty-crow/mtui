import { execFile } from 'node:child_process';
import type { CommandRunner } from '../native/CommandRunner.ts';

/** Keeps the final stdout from a GNU timeout sampling window (exit 124). */
export class CapturedTimeoutRunner implements CommandRunner {
  public run(executable: string, args: readonly string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(executable, [...args], { timeout: 1800, maxBuffer: 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
        if (error === null || error.code === 124) return resolve(stdout);
        reject(new Error('Intel performance counters are unavailable.'));
      });
    });
  }
}
