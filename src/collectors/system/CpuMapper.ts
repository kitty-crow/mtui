import type { Systeminformation } from 'systeminformation';
import type { CpuMetrics } from '../../domain/cpu.ts';
import { percentage, positive, temperature } from '../shared/normalise.ts';

/** Keeps package sensors separate from logical cores: their indices differ. */
export class CpuMapper {
  public map(
    load: Systeminformation.CurrentLoadData,
    info: Systeminformation.CpuData | null,
    speed: Systeminformation.CpuCurrentSpeedData | null,
    thermal: Systeminformation.CpuTemperatureData | null,
  ): CpuMetrics {
    return {
      model: info?.brand || 'Processor', manufacturer: info?.manufacturer || 'Unknown',
      physicalCores: info?.physicalCores ?? 0, logicalCores: load.cpus.length,
      usage: percentage(load.currentLoad), user: percentage(load.currentLoadUser),
      system: percentage(load.currentLoadSystem), temperature: temperature(thermal?.main),
      maxTemperature: temperature(thermal?.max),
      coreTemperatures: (thermal?.cores ?? []).flatMap(value => temperature(value) === null ? [] : [value]),
      speed: positive(speed?.avg),
      cores: load.cpus.map((core, id) => ({
        id, usage: percentage(core.load), user: percentage(core.loadUser), system: percentage(core.loadSystem),
        speed: positive(speed?.cores[id]),
      })),
    };
  }
}
