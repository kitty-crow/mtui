import type { Collector } from '../collectors/contracts/Collector.ts';
import { emptyReading, type Reading, type TelemetryValues, type Topic } from '../domain/snapshot.ts';
import { CollectorSlot } from './CollectorSlot.ts';

/** Typed composition point: removing a provider leaves its topic unavailable. */
export class CollectorRegistry {
  private readonly slots: { [K in Topic]?: CollectorSlot<TelemetryValues[K]> } = {};

  public register<K extends Topic>(topic: K, collector: Collector<TelemetryValues[K]>): void {
    Object.assign(this.slots, { [topic]: new CollectorSlot(collector) });
  }

  public remove(topic: Topic): void {
    delete this.slots[topic];
  }

  public async sample<K extends Topic>(topic: K, timeoutMs: number): Promise<Reading<TelemetryValues[K]>> {
    const slot = this.slots[topic];
    if (slot !== undefined) return slot.sample(timeoutMs);
    return { ...emptyReading<TelemetryValues[K]>('No collector registered'), status: 'unavailable' };
  }
}
