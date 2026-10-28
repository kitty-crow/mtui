import type { MemoryInventoryResult, MemoryInventorySource } from '../contracts/MemoryInventorySource.ts';
import type { SystemApi } from './SystemApi.ts';
import { MemoryModuleMapper } from './MemoryModuleMapper.ts';

/** Retains portable inventory when available, with an optional host fallback. */
export class MemoryInventory implements MemoryInventorySource {
  constructor(private readonly api: Pick<SystemApi, 'memLayout'>, private readonly fallback: MemoryInventorySource | null = null) {}

  public async read(): Promise<MemoryInventoryResult> {
    const data = await this.api.memLayout().catch(() => []);
    const modules = new MemoryModuleMapper().map(data);
    if (modules.length > 0) return { modules, message: null };
    if (this.fallback !== null) return this.fallback.read();
    return { modules: [], message: 'Physical memory inventory is not exposed by this host. Total RAM does not identify module count.' };
  }
}
