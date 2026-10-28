import type { MemoryModule } from '../../domain/memory.ts';

export interface MemoryInventoryResult {
  readonly modules: readonly MemoryModule[];
  readonly message: string | null;
}

/** Physical module discovery is independent of memory allocation counters. */
export interface MemoryInventorySource {
  read(): Promise<MemoryInventoryResult>;
}
