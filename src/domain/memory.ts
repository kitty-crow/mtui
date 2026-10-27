/** Installed memory inventory. Size is bytes; clock speed is MHz as reported. */
export interface MemoryModule {
  readonly bank: string;
  readonly type: string;
  readonly size: number;
  readonly clockSpeed: number | null;
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
}
