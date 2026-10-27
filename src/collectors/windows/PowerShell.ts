import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/** Encoded commands keep paths and script text out of shell interpretation. */
export function powershellArguments(script: string): string[] {
  return ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
}

export function powershellLiteral(value: string): string { return `'${value.replaceAll("'", "''")}'`; }

/** Setup operations have their own deadline, separate from polling commands. */
export class PowerShell {
  public async run(script: string): Promise<string> {
    try {
      const result = await promisify(execFile)('powershell.exe', powershellArguments(script), {
        timeout: 120_000, maxBuffer: 1024 * 1024, windowsHide: true, encoding: 'utf8',
      });
      return result.stdout.trim();
    } catch { throw new Error('Windows sensor setup failed; use an administrator terminal and check network access'); }
  }
}
