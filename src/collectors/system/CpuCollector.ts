import type { CpuMetrics } from '../../domain/cpu.ts';
import type { Collector } from '../contracts/Collector.ts';
import { CachedQuery } from '../shared/CachedQuery.ts';
import { CpuMapper } from './CpuMapper.ts';
import { CpuSensors } from './CpuSensors.ts';
import type { SensorSource } from '../native/SensorSource.ts';
import { optional, type SystemApi } from './SystemApi.ts';

/** Samples scheduler load while amortising processor inventory discovery. */
export class CpuCollector implements Collector<CpuMetrics> {
  public readonly name = 'Processor';
  private readonly inventory;
  private readonly mapper = new CpuMapper();

  constructor(private readonly api: SystemApi, private readonly sensors: SensorSource | null = null) {
    this.inventory = new CachedQuery(() => api.cpu());
  }

  public async collect(): Promise<CpuMetrics> {
    const [load, info, speed, thermal, sensors] = await Promise.all([
      this.api.currentLoad(), optional(this.inventory.get()),
      optional(this.api.cpuCurrentSpeed()), optional(this.api.cpuTemperature()),
      this.sensors === null ? Promise.resolve(null) : optional(this.sensors.read()),
    ]);
    return new CpuSensors().enrich(this.mapper.map(load, info, speed, thermal), sensors ?? []);
  }
}
