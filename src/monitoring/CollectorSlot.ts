import type { Collector } from '../collectors/contracts/Collector.ts';
import { emptyReading, type Reading } from '../domain/snapshot.ts';

/** Bounds response time without starting duplicate reads of a slow provider. */
export class CollectorSlot<T> {
  private pending: { promise: Promise<T>; settled: boolean; completedAt: number } | null = null;
  private reading: Reading<T> = emptyReading();

  constructor(private readonly collector: Collector<T>) {}

  public async sample(timeoutMs: number): Promise<Reading<T>> {
    const operation = this.pending ?? this.begin();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`${this.collector.name}: read timed out`)), timeoutMs);
    });
    try {
      const value = await Promise.race([operation.promise, deadline]);
      this.reading = { value, status: 'live', updatedAt: operation.completedAt, message: null };
    } catch (error: unknown) {
      this.reading = {
        ...this.reading,
        status: this.reading.value === null ? 'unavailable' : 'stale',
        message: error instanceof Error ? error.message : 'The collector could not complete its read',
      };
    } finally {
      clearTimeout(timer);
      if (operation.settled && this.pending === operation) this.pending = null;
    }
    return this.reading;
  }

  private begin(): NonNullable<CollectorSlot<T>['pending']> {
    const operation = {
      settled: false, completedAt: 0,
      promise: Promise.resolve().then(() => this.collector.collect()).then(value => {
        operation.completedAt = Date.now();
        return value;
      }).finally(() => { operation.settled = true; }),
    };
    this.pending = operation;
    return operation;
  }
}
