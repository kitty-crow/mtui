import type { SensorMetric } from '../../domain/sensors.ts';

/** Platform extension point for motherboard, DIMM and cooling sensors. */
export interface SensorSource {
  read(): Promise<readonly SensorMetric[]>;
  close?(): void;
}

export class EmptySensorSource implements SensorSource {
  public async read(): Promise<readonly SensorMetric[]> { return []; }
}
