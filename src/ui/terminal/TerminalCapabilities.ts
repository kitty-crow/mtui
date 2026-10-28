/** The classic Windows Console Host cannot be assumed to support modern TUI glyphs.
 * Keep Unicode for terminals advertising modern Unicode support and avoid changing
 * the user's global console code page or relying on shell elevation.
 */
export class TerminalCapabilities {
  constructor(
    private readonly platform: string = process.platform,
    private readonly environment: NodeJS.ProcessEnv = process.env,
  ) {}

  public requiresAscii(): boolean {
    if (this.platform !== 'win32') return false;
    const env = this.environment;
    if (env['MTUI_UNICODE'] === '1') return false;
    if (env['WT_SESSION'] || env['TERM_PROGRAM'] || env['ConEmuANSI'] === 'ON' || env['ANSICON'] || env['MSYSTEM']) return false;
    return true;
  }
}
