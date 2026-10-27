export type SensorUnit = '°C' | 'RPM' | 'V' | 'W' | '%';

/** Sensor labels and identifiers retain the reporting driver's identity. */
export interface SensorMetric {
  readonly id: string;
  readonly label: string;
  readonly device: string;
  readonly value: number | null;
  readonly unit: SensorUnit;
  readonly source: string;
}
