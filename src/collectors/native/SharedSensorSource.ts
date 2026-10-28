import type { SensorMetric } from '../../domain/sensors.ts';
import { CachedQuery } from '../shared/CachedQuery.ts';
import type { SensorSource } from './SensorSource.ts';

/** Coalesces simultaneous CPU and sensor reads without caching old measurements. */
export class SharedSensorSource implements SensorSource {
  private readonly query: CachedQuery<readonly SensorMetric[]>;
  constructor(private readonly source: SensorSource) {
    this.query = new CachedQuery(() => source.read(), 0);
  }
  public read(): Promise<readonly SensorMetric[]> { return this.query.get(); }
  /** The last completed sensor sample, without waiting for a slow hardware probe. */
  public peek(): readonly SensorMetric[] | null { return this.query.peek(); }
  public close(): void { this.source.close?.(); }
}
