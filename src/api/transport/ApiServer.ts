import type { ApiSettings } from '../config/ApiConfig.ts';
import type { ApiRouter } from '../routing/ApiRouter.ts';

/** HTTP lifecycle is independent of terminal rendering and collector discovery. */
export class ApiServer {
  private server: ReturnType<typeof Bun.serve> | null = null;
  constructor(private readonly settings: ApiSettings, private readonly router: ApiRouter) {}

  public start(): number {
    this.server ??= Bun.serve({ hostname: this.settings.hostname, port: this.settings.port, fetch: this.router.handle });
    return this.server.port ?? this.settings.port;
  }

  public stop(): void { void this.server?.stop(true); this.server = null; }
}
