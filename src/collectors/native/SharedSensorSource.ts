import type { SensorMetric } from '../../domain/sensors.ts';
import { CachedQuery } from '../shared/CachedQuery.ts';
import type { SensorSource } from './SensorSource.ts';

/** Coalesces simultaneous CPU and sensor reads without caching old measurements. */
export class SharedSensorSource implements SensorSource {
  private readonly query: CachedQuery<readonly SensorMetric[]>;
  private updatedAt = 0;
  constructor(private readonly source: SensorSource) {
    this.query = new CachedQuery(() => source.read(), 0);
  }
  public async read(): Promise<readonly SensorMetric[]> {
    const sensors = await this.query.get();
    this.updatedAt = Date.now();
    return sensors;
  }
  /** The last completed sensor sample, without waiting for a slow hardware probe. */
  public peek(): readonly SensorMetric[] | null {
    return this.updatedAt > 0 && Date.now() - this.updatedAt <= 15_000 ? this.query.peek() : null;
  }
  public close(): void { this.source.close?.(); }
}
