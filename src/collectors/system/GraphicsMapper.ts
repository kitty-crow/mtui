import type { Systeminformation } from 'systeminformation';
import type { GpuMetrics } from '../../domain/graphics.ts';
import { mebibytes, nonNegative, percentage, positive, ratio, temperature } from '../shared/normalise.ts';

/** Normalises vendor telemetry. Memory-engine utilisation differs from occupancy. */
export class GraphicsMapper {
  public map(data: Systeminformation.GraphicsControllerData, index: number): GpuMetrics {
    const memoryTotal = mebibytes(positive(data.memoryTotal) ?? positive(data.vram));
    const memoryUsed = mebibytes(data.memoryUsed);
    return {
      id: data.pciBus || data.busAddress || `${data.vendor}:${data.model}:${index}`,
      model: data.model || data.name || 'Graphics adapter', vendor: data.vendor || 'Unknown',
      bus: data.pciBus || data.busAddress || data.bus || 'Unknown', driver: data.driverVersion || 'Unknown',
      sharedMemory: data.vramDynamic, usage: percentage(data.utilizationGpu),
      memoryUsage: ratio(memoryUsed, memoryTotal), memoryTotal, memoryUsed,
      temperature: temperature(data.temperatureGpu), memoryTemperature: temperature(data.temperatureMemory),
      fanPercent: percentage(data.fanSpeed), power: nonNegative(data.powerDraw), powerLimit: positive(data.powerLimit),
      coreClock: positive(data.clockCore), memoryClock: positive(data.clockMemory),
    };
  }
}
