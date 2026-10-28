import type { MemoryMetrics } from '../../domain/memory.ts';
import type { Collector } from '../contracts/Collector.ts';
import { CachedQuery } from '../shared/CachedQuery.ts';
import { MemoryMapper } from './MemoryMapper.ts';
import type { SystemApi } from './SystemApi.ts';
import type { MemoryInventorySource } from '../contracts/MemoryInventorySource.ts';
import { MemoryInventory } from './MemoryInventory.ts';

/** Memory module discovery is optional; its failure cannot hide RAM usage. */
export class MemoryCollector implements Collector<MemoryMetrics> {
  public readonly name = 'Memory';
  private readonly inventory;
  private readonly mapper = new MemoryMapper();

  constructor(private readonly api: SystemApi, inventory: MemoryInventorySource = new MemoryInventory(api)) {
    this.inventory = new CachedQuery(async () => {
      try { return await inventory.read(); }
      catch { return { modules: [], message: 'Physical memory inventory query failed.' }; }
    });
  }

  public async collect(): Promise<MemoryMetrics> {
    // Firmware discovery can outlast a sample; allocation counters stay live.
    void this.inventory.get();
    const memory = await this.api.mem();
    const inventory = this.inventory.peek() ?? { modules: [], message: 'Discovering physical memory inventory…' };
    return { ...this.mapper.map(memory, []), modules: inventory.modules, inventoryMessage: inventory.message };
  }
}
