import type { ApiSettings } from '../api/config/ApiConfig.ts';
import { ResourceCatalogue } from '../api/resources/ResourceCatalogue.ts';
import type { MonitorIdentity } from '../api/resources/ApiPayload.ts';
import { ApiRouter } from '../api/routing/ApiRouter.ts';
import { ApiServer } from '../api/transport/ApiServer.ts';
import type { MonitorEngine } from '../monitoring/MonitorEngine.ts';

/** Owns the resources that outlive an individual terminal view. */
export class MonitorSession {
  public readonly catalogue: ResourceCatalogue;
  private api: ApiServer | null = null;

  constructor(public readonly monitor: MonitorEngine, public readonly identity: MonitorIdentity, public readonly remote: string | null) {
    this.catalogue = new ResourceCatalogue(monitor, identity);
  }

  public startApi(settings: ApiSettings): string {
    this.api = new ApiServer(settings, new ApiRouter(this.catalogue, settings.token));
    const port = this.api.start();
    return `http://${settings.hostname}:${port}`;
  }

  public close(): void { this.monitor.stop(); this.api?.stop(); }
}
