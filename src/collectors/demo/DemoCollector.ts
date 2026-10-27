import type { Collector } from '../contracts/Collector.ts';

/** In-memory source for the interactive tour and deterministic integration tests. */
export class DemoCollector<T> implements Collector<T> {
  constructor(public readonly name: string, private readonly sample: () => T) {}
  public async collect(): Promise<T> { return this.sample(); }
}
