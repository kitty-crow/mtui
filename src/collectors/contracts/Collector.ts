/** An independently replaceable source for a single telemetry topic. */
export interface Collector<T> {
  readonly name: string;
  collect(): Promise<T>;
}
