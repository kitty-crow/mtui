import type { SensorMetric } from '../../domain/sensors.ts';
import type { SensorSource } from '../native/SensorSource.ts';

/** Reuses an existing publisher when present, otherwise owns a headless reader. */
export class WindowsSensorBackend implements SensorSource {
  private providerAvailable = true;
  private failure: Error | null = null;
  private retryAt = 0;

  constructor(private readonly provider: SensorSource, private readonly native: SensorSource) {}

  public async read(): Promise<readonly SensorMetric[]> {
    if (this.failure !== null && Date.now() < this.retryAt) throw this.failure;
    const published = this.providerAvailable ? await this.published() : null;
    if (published !== null) return published;
    try {
      const sensors = await this.native.read();
      this.failure = null;
      return sensors;
    } catch (error: unknown) {
      this.failure = error instanceof Error ? error : new Error('Hardware sensor reader unavailable');
      this.retryAt = Date.now() + 30_000;
      throw this.failure;
    }
  }

  public close(): void { this.provider.close?.(); this.native.close?.(); }

  private async published(): Promise<readonly SensorMetric[] | null> {
    try {
      const sensors = await this.provider.read();
      if (sensors.some(sensor => sensor.value !== null)) return sensors;
    } catch { /* No running publisher: the integrated reader is the fallback. */ }
    this.providerAvailable = false;
    return null;
  }
}
