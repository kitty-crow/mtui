import { uptime } from 'node:os';
import type { Snapshot } from '../domain/snapshot.ts';
import type { CollectorRegistry } from './CollectorRegistry.ts';
import type { SnapshotSource } from './SnapshotSource.ts';

/** Every topic is sampled concurrently; a deadline isolates slow collectors. */
export class LocalSnapshotSource implements SnapshotSource {
  constructor(private readonly registry: CollectorRegistry, private readonly timeoutMs = 2500) {}

  public async read(sequence: number): Promise<Snapshot> {
    const [cpu, memory, graphics, sensors] = await Promise.all([
      this.registry.sample('cpu', this.timeoutMs), this.registry.sample('memory', this.timeoutMs),
      this.registry.sample('graphics', this.timeoutMs), this.registry.sample('sensors', this.timeoutMs),
    ]);
    return { sequence, sampledAt: Date.now(), uptime: uptime(), readings: { cpu, memory, graphics, sensors } };
  }
}
