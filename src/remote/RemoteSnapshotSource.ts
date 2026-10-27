import { emptySnapshot, type Reading, type Snapshot } from '../domain/snapshot.ts';
import type { SnapshotSource } from '../monitoring/SnapshotSource.ts';
import type { RemoteClient } from './RemoteClient.ts';

/** Failed connections preserve the last host sample and mark every topic stale. */
export class RemoteSnapshotSource implements SnapshotSource {
  private last = emptySnapshot();
  constructor(private readonly client: Pick<RemoteClient, 'read'>, initial: Snapshot = emptySnapshot()) { this.last = initial; }

  public async read(sequence: number): Promise<Snapshot> {
    try {
      const payload = await this.client.read();
      this.last = payload.snapshot;
      if (payload.paused) return this.markFailed(sequence, 'The host monitor is paused');
      return this.last;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Remote connection failed';
      return this.markFailed(sequence, message);
    }
  }

  private markFailed(sequence: number, message: string): Snapshot {
    const { cpu, memory, graphics, sensors } = this.last.readings;
    this.last = {
      ...this.last, sequence, sampledAt: Date.now(),
      readings: { cpu: this.failed(cpu, message), memory: this.failed(memory, message), graphics: this.failed(graphics, message), sensors: this.failed(sensors, message) },
    };
    return this.last;
  }

  private failed<T>(reading: Reading<T>, message: string): Reading<T> {
    return { ...reading, status: reading.value === null ? 'unavailable' : 'stale', message };
  }
}
