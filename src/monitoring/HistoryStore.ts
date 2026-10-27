import type { Snapshot } from '../domain/snapshot.ts';
import { ratio } from '../collectors/shared/normalise.ts';

export interface HistoryPoint {
  readonly at: number;
  readonly value: number | null;
}

/** Bounded, timestamped series. Failed reads introduce gaps, not repeated data. */
export class HistoryStore {
  private readonly series = new Map<string, HistoryPoint[]>();

  constructor(public readonly capacity = 120) {
    if (!Number.isInteger(capacity) || capacity < 2) throw new Error('History capacity must be at least 2');
  }

  public record(snapshot: Snapshot): void {
    const { cpu, memory, graphics } = snapshot.readings;
    this.append('cpu.usage', cpu.status === 'live' ? cpu.value?.usage ?? null : null, snapshot.sampledAt);
    this.append('cpu.temperature', cpu.status === 'live' ? cpu.value?.temperature ?? null : null, snapshot.sampledAt);
    const ram = memory.status === 'live' ? memory.value : null;
    this.append('memory.usage', ram === null ? null : ratio(ram.active, ram.total), snapshot.sampledAt);
    const gpus = graphics.value ?? [];
    const activeKeys = new Set(['cpu.usage', 'cpu.temperature', 'memory.usage']);
    for (const gpu of gpus) {
      const key = `gpu.${gpu.id}`;
      activeKeys.add(`${key}.usage`);
      activeKeys.add(`${key}.temperature`);
      this.append(`${key}.usage`, graphics.status === 'live' ? gpu.usage : null, snapshot.sampledAt);
      this.append(`${key}.temperature`, graphics.status === 'live' ? gpu.temperature : null, snapshot.sampledAt);
    }
    for (const key of this.series.keys()) {
      if (!activeKeys.has(key)) this.series.delete(key);
    }
  }

  public get(key: string): readonly HistoryPoint[] {
    return this.series.get(key) ?? [];
  }

  public all(): Readonly<Record<string, readonly HistoryPoint[]>> {
    return Object.fromEntries(this.series);
  }

  public peak(key: string): number | null {
    const values = this.get(key).flatMap(point => point.value === null ? [] : [point.value]);
    return values.length === 0 ? null : Math.max(...values);
  }

  private append(key: string, value: number | null, at: number): void {
    const points = [...(this.series.get(key) ?? []), { at, value }];
    points.splice(0, Math.max(0, points.length - this.capacity));
    this.series.set(key, points);
  }
}
