/** One physical or integrated graphics adapter. Unknown metrics remain null. */
export interface GpuMetrics {
  readonly id: string;
  readonly model: string;
  readonly vendor: string;
  readonly bus: string;
  readonly driver: string;
  readonly sharedMemory: boolean;
  readonly usage: number | null;
  readonly memoryUsage: number | null;
  readonly memoryTotal: number | null;
  readonly memoryUsed: number | null;
  readonly temperature: number | null;
  readonly memoryTemperature: number | null;
  readonly fanPercent: number | null;
  readonly power: number | null;
  readonly powerLimit: number | null;
  readonly coreClock: number | null;
  readonly memoryClock: number | null;
  /** Optional adapter diagnostic, also exposed through the JSON API. */
  readonly telemetryMessage?: string | null | undefined;
}
