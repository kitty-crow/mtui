import type { Reading, Snapshot } from '../../domain/snapshot.ts';
import type { MonitorEngine } from '../../monitoring/MonitorEngine.ts';
import { SensorCatalogue } from '../../monitoring/SensorCatalogue.ts';
import type { ApiPayload, MonitorIdentity } from './ApiPayload.ts';

export interface Resource {
  readonly reading: Reading<unknown>;
  readonly value: unknown;
}

/** Read-only projections never trigger hardware queries or mutate the monitor. */
export class ResourceCatalogue {
  private readonly sensors = new SensorCatalogue();
  constructor(private readonly monitor: MonitorEngine, private readonly identity: MonitorIdentity) {}

  public payload(): ApiPayload {
    return { ...this.identity, schemaVersion: 1, product: 'mTUI', intervalMs: this.monitor.interval, paused: this.monitor.isPaused, snapshot: this.monitor.getSnapshot() };
  }

  public resource(name: string): Resource | null {
    const snapshot = this.monitor.getSnapshot();
    const { cpu, memory, graphics } = snapshot.readings;
    if (name === 'gpu') return { reading: graphics, value: graphics.value?.map((gpu, index) => ({ index, ...gpu, temp: gpu.temperature, fan: gpu.fanPercent, vram: { total: gpu.memoryTotal, used: gpu.memoryUsed, usage: gpu.memoryUsage } })) ?? null };
    if (name === 'proc') return { reading: cpu, value: cpu.value === null ? null : { ...cpu.value, temp: cpu.value.temperature } };
    if (name === 'ram') return { reading: memory, value: memory.value === null ? null : { ...memory.value, used: memory.value.active, usage: memory.value.total > 0 ? memory.value.active / memory.value.total * 100 : null } };
    if (name === 'sensors') return { reading: this.catalogueReading(snapshot), value: this.sensors.list(snapshot) };
    return null;
  }

  public history(): Readonly<Record<string, unknown>> { return this.monitor.history.all(); }

  public sensorReading(index: number): Reading<unknown> | null {
    const sensor = this.sensors.list(this.monitor.getSnapshot())[index];
    return sensor === undefined ? null : { value: sensor, status: sensor.status, updatedAt: sensor.updatedAt, message: sensor.message };
  }

  private catalogueReading(snapshot: Snapshot): Reading<unknown> {
    const samples = [snapshot.readings.sensors, snapshot.readings.cpu, snapshot.readings.graphics];
    const live = samples.find(sample => sample.status === 'live');
    return live ?? snapshot.readings.sensors;
  }
}
