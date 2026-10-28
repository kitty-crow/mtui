/** Installed memory inventory. Size is bytes; DDR transfer rate is MT/s. */
export interface MemoryModule {
  readonly bank: string;
  readonly type: string;
  readonly size: number;
  readonly clockSpeed: number | null;
  /** DDR effective transfer rate; clockSpeed retains the provider's legacy value. */
  readonly transferRate?: number | null;
  readonly manufacturer: string;
  readonly formFactor: string;
  readonly ecc: boolean | null;
}

/** All capacities use bytes. Active memory excludes reclaimable cache. */
export interface MemoryMetrics {
  readonly total: number;
  readonly active: number;
  readonly available: number;
  readonly free: number;
  readonly cached: number | null;
  readonly swapTotal: number;
  readonly swapUsed: number;
  readonly modules: readonly MemoryModule[];
  /** Inventory availability is separate from live RAM allocation counters. */
  readonly inventoryMessage?: string | null;
}
