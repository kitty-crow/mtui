import type { Systeminformation } from 'systeminformation';
import type { MemoryMetrics } from '../../domain/memory.ts';
import { nonNegative, positive } from '../shared/normalise.ts';

/** Normalises the active/cache distinction into the same byte-based model. */
export class MemoryMapper {
  public map(data: Systeminformation.MemData, modules: readonly Systeminformation.MemLayoutData[]): MemoryMetrics {
    const total = nonNegative(data.total) ?? 0;
    return {
      total, active: Math.min(total, nonNegative(data.active) ?? 0),
      available: Math.min(total, nonNegative(data.available) ?? 0), free: nonNegative(data.free) ?? 0,
      cached: nonNegative(data.buffcache), swapTotal: nonNegative(data.swaptotal) ?? 0,
      swapUsed: nonNegative(data.swapused) ?? 0,
      modules: modules.filter(module => module.size > 0).map((module, index) => ({
        bank: module.bank || `Module ${index + 1}`, type: module.type || 'Unknown', size: module.size,
        clockSpeed: positive(module.clockSpeed), manufacturer: module.manufacturer || 'Unknown',
        formFactor: module.formFactor || 'Unknown', ecc: module.ecc ?? null,
      })),
    };
  }
}
