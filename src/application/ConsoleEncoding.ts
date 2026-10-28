import { execFileSync } from 'node:child_process';

/** Windows console code pages belong to the console, not to the launching shell. */
export type CodePageCommand = (codePage?: string) => string;

function changeCodePage(codePage?: string): string {
  const command = process.env['ComSpec'] ?? 'cmd.exe';
  const args = ['/d', '/c', 'chcp', ...(codePage === undefined ? [] : [codePage])];
  return execFileSync(command, args, {
    encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], timeout: 5_000,
  }).trim();
}

/** Enables UTF-8 before Ink renders and restores the caller's code page on exit. */
export class ConsoleEncoding {
  constructor(
    private readonly platform: string = process.platform,
    private readonly interactive: boolean = Boolean(process.stdout.isTTY),
    private readonly run: CodePageCommand = changeCodePage,
  ) {}

  public prepare(): () => void {
    if (this.platform !== 'win32' || !this.interactive) return () => {};
    try {
      const previous = this.run().match(/(?:^|\D)(\d{3,5})\D*$/)?.[1];
      if (previous === undefined || previous === '65001') return () => {};
      this.run('65001');
      return () => { try { this.run(previous); } catch { /* Preserve application shutdown. */ } };
    } catch { return () => {}; }
  }
}
