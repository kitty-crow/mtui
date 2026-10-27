import type { SensorMetric } from '../../domain/sensors.ts';
import type { Collector } from '../contracts/Collector.ts';
import type { SensorSource } from '../native/SensorSource.ts';

/** Keeps platform discovery separate from the monitoring lifecycle. */
export class SensorCollector implements Collector<readonly SensorMetric[]> {
  public readonly name = 'Hardware sensors';
  constructor(private readonly source: SensorSource) {}
  public collect(): Promise<readonly SensorMetric[]> { return this.source.read(); }
}
