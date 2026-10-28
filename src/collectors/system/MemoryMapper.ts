import type { Systeminformation } from 'systeminformation';
import type { MemoryMetrics } from '../../domain/memory.ts';
import { nonNegative } from '../shared/normalise.ts';
import { MemoryModuleMapper } from './MemoryModuleMapper.ts';

/** Normalises the active/cache distinction into the same byte-based model. */
export class MemoryMapper {
  public map(data: Systeminformation.MemData, modules: readonly Systeminformation.MemLayoutData[]): MemoryMetrics {
    const total = nonNegative(data.total) ?? 0;
    return {
      total, active: Math.min(total, nonNegative(data.active) ?? 0),
      available: Math.min(total, nonNegative(data.available) ?? 0), free: nonNegative(data.free) ?? 0,
      cached: nonNegative(data.buffcache), swapTotal: nonNegative(data.swaptotal) ?? 0,
      swapUsed: nonNegative(data.swapused) ?? 0,
      modules: new MemoryModuleMapper().map(modules),
    };
  }
}
