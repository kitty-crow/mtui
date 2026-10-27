import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface CommandRunner {
  run(executable: string, args: readonly string[]): Promise<string>;
}

/** Fixed argument arrays avoid a shell. Sensor queries have a hard time limit. */
export class NativeCommandRunner implements CommandRunner {
  public async run(executable: string, args: readonly string[]): Promise<string> {
    const { stdout } = await promisify(execFile)(executable, [...args], {
      timeout: 1800, maxBuffer: 1024 * 1024, windowsHide: true, encoding: 'utf8',
    });
    return stdout;
  }
}
