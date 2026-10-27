import type { CpuMetrics } from './cpu.ts';
import type { GpuMetrics } from './graphics.ts';
import type { MemoryMetrics } from './memory.ts';
import type { SensorMetric } from './sensors.ts';

export interface TelemetryValues {
  readonly cpu: CpuMetrics;
  readonly memory: MemoryMetrics;
  readonly graphics: readonly GpuMetrics[];
  readonly sensors: readonly SensorMetric[];
}

export type Topic = keyof TelemetryValues;
export type ReadingStatus = 'waiting' | 'live' | 'stale' | 'unavailable';

/** A last-good value always carries its own timestamp and freshness state. */
export interface Reading<T> {
  readonly value: T | null;
  readonly status: ReadingStatus;
  readonly updatedAt: number | null;
  readonly message: string | null;
}

export type Readings = { readonly [K in Topic]: Reading<TelemetryValues[K]> };

export interface HostIdentity {
  readonly hostname: string;
  readonly platform: string;
  readonly release: string;
  readonly architecture: string;
}

export interface Snapshot {
  readonly sequence: number;
  readonly sampledAt: number;
  readonly uptime: number;
  readonly readings: Readings;
}

export function emptyReading<T>(message: string | null = null): Reading<T> {
  return { value: null, status: 'waiting', updatedAt: null, message };
}

export function emptySnapshot(): Snapshot {
  return {
    sequence: 0, sampledAt: 0, uptime: 0,
    readings: { cpu: emptyReading(), memory: emptyReading(), graphics: emptyReading(), sensors: emptyReading() },
  };
}
