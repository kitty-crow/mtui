import { DemoScenario } from '../../src/collectors/demo/DemoScenario.ts';
import { CollectorRegistry } from '../../src/monitoring/CollectorRegistry.ts';
import { LocalSnapshotSource } from '../../src/monitoring/LocalSnapshotSource.ts';
import { HistoryStore } from '../../src/monitoring/HistoryStore.ts';
import { MonitorEngine } from '../../src/monitoring/MonitorEngine.ts';
import { ResourceCatalogue } from '../../src/api/resources/ResourceCatalogue.ts';
import { ApiRouter } from '../../src/api/routing/ApiRouter.ts';

export async function demoMonitor() {
  const scenario = new DemoScenario(() => 100_000);
  const registry = new CollectorRegistry();
  scenario.register(registry);
  const monitor = new MonitorEngine(new LocalSnapshotSource(registry), new HistoryStore(30));
  await monitor.refresh();
  const identity = { host: { hostname: 'test-host', platform: 'linux', release: 'test', architecture: 'x64' }, version: '0.1.0', demo: true };
  const catalogue = new ResourceCatalogue(monitor, identity);
  return { monitor, registry, scenario, identity, catalogue, router: new ApiRouter(catalogue) };
}

export function request(path: string, init?: ConstructorParameters<typeof Request>[1]): Request {
  return new Request(`http://localhost:9700${path}`, init);
}

export async function body(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected a JSON object');
  return value as Record<string, unknown>;
}
