export interface ApiSettings { readonly port: number; readonly hostname: string; readonly token: string | null }

/** Bun loads .env automatically. Tests can supply an isolated environment map. */
export class ApiConfig {
  public read(env: Readonly<Record<string, string | undefined>> = process.env): ApiSettings {
    const port = Number(env['MTUI_PORT'] ?? '9700');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MTUI_PORT accepts an integer from 1 to 65535');
    return { port, hostname: '0.0.0.0', token: env['MTUI_TOKEN']?.trim() || null };
  }
}
