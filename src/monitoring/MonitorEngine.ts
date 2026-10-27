import { emptySnapshot, type Snapshot } from '../domain/snapshot.ts';
import { HistoryStore } from './HistoryStore.ts';
import type { SnapshotSource } from './SnapshotSource.ts';

/** Serial polling loop with independent provider deadlines and bounded history. */
export class MonitorEngine {
  private snapshot: Snapshot = emptySnapshot();
  private readonly listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Promise<void> | null = null;
  private running = false;
  private paused = false;

  constructor(
    private readonly source: SnapshotSource,
    public readonly history = new HistoryStore(),
    private intervalMs = 1000,
  ) {}

  public getSnapshot = (): Snapshot => this.snapshot;
  public get interval(): number { return this.intervalMs; }
  public get isPaused(): boolean { return this.paused; }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  public start(): void {
    if (this.running) return;
    this.running = true;
    void this.refresh();
  }

  public stop(): void {
    this.running = false;
    this.cancelTimer();
  }

  public togglePause(): void {
    this.paused = !this.paused;
    this.cancelTimer();
    if (!this.paused && this.running) void this.refresh();
    this.notify();
  }

  public setInterval(milliseconds: number): void {
    this.intervalMs = Math.min(10_000, Math.max(250, milliseconds));
    this.cancelTimer();
    if (this.pending === null) this.schedule();
    this.notify();
  }

  public refresh(): Promise<void> {
    if (this.pending !== null) return this.pending;
    if (this.paused) return Promise.resolve();
    this.cancelTimer();
    this.pending = this.poll().finally(() => {
      this.pending = null;
      this.schedule();
    });
    return this.pending;
  }

  private async poll(): Promise<void> {
    const next = await this.source.read(this.snapshot.sequence + 1);
    const changed = next.sequence !== this.snapshot.sequence || next.sampledAt !== this.snapshot.sampledAt;
    this.snapshot = next;
    if (changed) this.history.record(this.snapshot);
    this.notify();
  }

  private schedule(): void {
    if (!this.running || this.paused) return;
    this.timer = setTimeout(() => { void this.refresh(); }, this.intervalMs);
  }

  private cancelTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
