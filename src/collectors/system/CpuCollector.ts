import type { CpuMetrics } from '../../domain/cpu.ts';
import type { Collector } from '../contracts/Collector.ts';
import { CachedQuery } from '../shared/CachedQuery.ts';
import { CpuMapper } from './CpuMapper.ts';
import { CpuSensors } from './CpuSensors.ts';
import type { SharedSensorSource } from '../native/SharedSensorSource.ts';
import { optional, type SystemApi } from './SystemApi.ts';

/** Samples scheduler load while amortising processor inventory discovery. */
export class CpuCollector implements Collector<CpuMetrics> {
  public readonly name = 'Processor';
  private readonly inventory;
  private readonly mapper = new CpuMapper();

  constructor(private readonly api: SystemApi, private readonly sensors: Pick<SharedSensorSource, 'peek'> | null = null) {
    this.inventory = new CachedQuery(() => api.cpu());
  }

  public async collect(): Promise<CpuMetrics> {
    const [load, info, speed, thermal] = await Promise.all([
      this.api.currentLoad(), optional(this.inventory.get()),
      optional(this.api.cpuCurrentSpeed()), optional(this.api.cpuTemperature()),
    ]);
    return new CpuSensors().enrich(this.mapper.map(load, info, speed, thermal), this.sensors?.peek() ?? []);
  }
}
