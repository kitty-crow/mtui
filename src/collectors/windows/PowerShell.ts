import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/** Encoded commands keep paths and script text out of shell interpretation. */
export function powershellArguments(script: string): string[] {
  return ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
}

export function powershellLiteral(value: string): string { return `'${value.replaceAll("'", "''")}'`; }

/** Reports subprocess diagnostics without including the encoded command or a shell transcript. */
export function powershellFailure(error: unknown, operation: string): Error {
  const details = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const stderr = typeof details['stderr'] === 'string' ? details['stderr'].trim() : '';
  if (stderr !== '') return new Error(`${operation}: ${stderr.slice(0, 1200)}`);
  if (details['killed'] === true) return new Error(`${operation}: timed out after 120 seconds`);
  if (details['code'] === 'ENOENT') return new Error(`${operation}: Windows PowerShell could not be found`);
  return new Error(`${operation}: PowerShell exited with code ${String(details['code'] ?? 'unknown')}`);
}

/** Console output avoids PowerShell's CLIXML error stream when invoked without a terminal. */
export function setupScript(script: string): string {
  return `$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; [Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false); try { & { ${script}\n } } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }`;
}

/** Setup operations have their own deadline, separate from polling commands. */
export class PowerShell {
  constructor(private readonly executable = 'powershell.exe') {}

  public async run(script: string, operation = 'Windows sensor setup'): Promise<string> {
    try {
      const result = await promisify(execFile)(this.executable, powershellArguments(setupScript(script)), {
        timeout: 120_000, maxBuffer: 1024 * 1024, windowsHide: true, encoding: 'utf8',
      });
      return result.stdout.trim();
    } catch (error: unknown) { throw powershellFailure(error, operation); }
  }
}
