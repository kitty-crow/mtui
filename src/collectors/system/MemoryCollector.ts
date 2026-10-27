import type { MemoryMetrics } from '../../domain/memory.ts';
import type { Collector } from '../contracts/Collector.ts';
import { CachedQuery } from '../shared/CachedQuery.ts';
import { MemoryMapper } from './MemoryMapper.ts';
import { optional, type SystemApi } from './SystemApi.ts';

/** Memory module discovery is optional; its failure cannot hide RAM usage. */
export class MemoryCollector implements Collector<MemoryMetrics> {
  public readonly name = 'Memory';
  private readonly inventory;
  private readonly mapper = new MemoryMapper();

  constructor(private readonly api: SystemApi) {
    this.inventory = new CachedQuery(() => api.memLayout());
  }

  public async collect(): Promise<MemoryMetrics> {
    const [memory, modules] = await Promise.all([this.api.mem(), optional(this.inventory.get())]);
    return this.mapper.map(memory, modules ?? []);
  }
}
