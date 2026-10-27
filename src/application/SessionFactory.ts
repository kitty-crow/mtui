import { hostname, platform, release, arch } from 'node:os';
import type { Options } from '../cli/Options.ts';
import { CpuCollector } from '../collectors/system/CpuCollector.ts';
import { MemoryCollector } from '../collectors/system/MemoryCollector.ts';
import { GraphicsCollector } from '../collectors/system/GraphicsCollector.ts';
import { SensorCollector } from '../collectors/system/SensorCollector.ts';
import { SharedSensorSource } from '../collectors/native/SharedSensorSource.ts';
import { systemApi } from '../collectors/system/SystemApi.ts';
import { DemoScenario } from '../collectors/demo/DemoScenario.ts';
import { CollectorRegistry } from '../monitoring/CollectorRegistry.ts';
import { HistoryStore } from '../monitoring/HistoryStore.ts';
import { LocalSnapshotSource } from '../monitoring/LocalSnapshotSource.ts';
import { MonitorEngine } from '../monitoring/MonitorEngine.ts';
import { RemoteClient } from '../remote/RemoteClient.ts';
import { RemoteSnapshotSource } from '../remote/RemoteSnapshotSource.ts';
import { MonitorSession } from './MonitorSession.ts';
import { PlatformFactory } from './PlatformFactory.ts';
import { version } from './version.ts';

/** Composition root for local, simulated and remote monitoring sessions. */
export class SessionFactory {
  public async create(options: Options): Promise<MonitorSession> {
    if (options.connect !== null) return this.remote(options);
    const registry = new CollectorRegistry();
    const adapters = new PlatformFactory();
    if (options.demo) new DemoScenario().register(registry);
    if (!options.demo) this.registerLocal(registry, adapters);
    const monitor = new MonitorEngine(new LocalSnapshotSource(registry), new HistoryStore(options.history), options.interval);
    return new MonitorSession(monitor, { host: { hostname: options.demo ? 'demo-workstation' : hostname(), platform: platform(), release: release(), architecture: arch() }, version, demo: options.demo }, null);
  }

  private registerLocal(registry: CollectorRegistry, adapters: PlatformFactory): void {
    const sensors = new SharedSensorSource(adapters.sensors());
    registry.register('cpu', new CpuCollector(systemApi, sensors));
    registry.register('memory', new MemoryCollector(systemApi));
    registry.register('graphics', new GraphicsCollector(systemApi, adapters.graphics(), adapters.nvidia()));
    registry.register('sensors', new SensorCollector(sensors));
  }

  private async remote(options: Options): Promise<MonitorSession> {
    const client = new RemoteClient(options.connect ?? '', process.env['MTUI_TOKEN']?.trim() || null);
    const payload = await client.read();
    const monitor = new MonitorEngine(new RemoteSnapshotSource(client, payload.snapshot), new HistoryStore(options.history), options.interval);
    return new MonitorSession(monitor, { host: payload.host, demo: payload.demo, version: payload.version }, client.url.origin);
  }
}
