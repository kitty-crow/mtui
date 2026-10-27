import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';

interface Request { readonly resolve: (value: unknown) => void; readonly reject: (error: Error) => void; readonly timer: ReturnType<typeof setTimeout> }

/** Bounded JSON-line transport; closing the input releases the helper's hardware handles. */
export class LineWorker {
  private child: ChildProcessWithoutNullStreams | null = null;
  private lines: Interface | null = null;
  private request: Request | null = null;
  private pending: Promise<unknown> | null = null;
  private closed = false;

  constructor(private readonly executable: string, private readonly args: readonly string[], private readonly cwd: string, private readonly timeoutMs = 20_000) {}

  public read(): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('Sensor reader is closed'));
    if (this.pending !== null) return this.pending;
    this.pending = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => { this.fail(new Error('Hardware sensor reader timed out')); this.destroy(); }, this.timeoutMs);
      this.request = { resolve, reject, timer };
      this.start();
      this.child?.stdin.write('sample\n', error => { if (error) this.fail(new Error('Hardware sensor reader disconnected')); });
    }).finally(() => { this.pending = null; });
    return this.pending;
  }

  public close(): void {
    this.closed = true;
    this.fail(new Error('Sensor reader is closed'));
    const child = this.child;
    child?.stdin.end();
    const timer = setTimeout(() => child?.kill(), 2000);
    timer.unref();
  }

  private start(): void {
    if (this.child !== null) return;
    const child = spawn(this.executable, [...this.args], { cwd: this.cwd, windowsHide: true, stdio: 'pipe' });
    this.child = child;
    this.lines = createInterface({ input: child.stdout });
    this.lines.on('line', line => this.receive(line));
    child.stderr.on('data', () => { /* Diagnostics are delivered through the JSON protocol. */ });
    child.once('error', () => { this.fail(new Error('Cannot start the hardware sensor reader')); this.destroy(); });
    child.once('exit', () => {
      if (this.child !== child) return;
      this.fail(new Error('Hardware sensor reader exited before returning measurements'));
      this.lines?.close();
      this.child = null;
      this.lines = null;
    });
  }

  private receive(line: string): void {
    if (line.length > 1024 * 1024) { this.fail(new Error('Hardware sensor response exceeds the size limit')); this.destroy(); return; }
    try {
      const value: unknown = JSON.parse(line.replace(/^\uFEFF/, ''));
      const request = this.request;
      if (request === null) return;
      clearTimeout(request.timer);
      this.request = null;
      request.resolve(value);
    } catch { this.fail(new Error('Hardware sensor reader returned invalid JSON')); this.destroy(); }
  }

  private fail(error: Error): void {
    if (this.request === null) return;
    clearTimeout(this.request.timer);
    this.request.reject(error);
    this.request = null;
  }

  private destroy(): void {
    this.lines?.close();
    this.child?.kill();
    this.lines = null;
    this.child = null;
  }
}
