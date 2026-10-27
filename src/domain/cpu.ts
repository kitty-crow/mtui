/** A scheduler-visible logical processor. Frequencies are in GHz. */
export interface CpuCore {
  readonly id: number;
  readonly usage: number | null;
  readonly user: number | null;
  readonly system: number | null;
  readonly speed: number | null;
}

/** CPU package and scheduler measurements, independent of the host API. */
export interface CpuMetrics {
  readonly model: string;
  readonly manufacturer: string;
  readonly physicalCores: number;
  readonly logicalCores: number;
  readonly usage: number | null;
  readonly user: number | null;
  readonly system: number | null;
  readonly temperature: number | null;
  readonly maxTemperature: number | null;
  readonly coreTemperatures: readonly number[];
  readonly speed: number | null;
  readonly cores: readonly CpuCore[];
}
