/** Caches slow inventory reads and coalesces concurrent requests. */
export class CachedQuery<T> {
  private value: T | null = null;
  private expiresAt = 0;
  private pending: Promise<T> | null = null;

  constructor(private readonly query: () => Promise<T>, private readonly ttlMs = 60_000) {}

  public get(): Promise<T> {
    if (this.value !== null && Date.now() < this.expiresAt) return Promise.resolve(this.value);
    if (this.pending !== null) return this.pending;
    this.pending = this.query().then(value => {
      this.value = value;
      this.expiresAt = Date.now() + this.ttlMs;
      return value;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
}
