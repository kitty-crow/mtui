import { basename } from 'node:path';
import type { GpuMetrics } from '../../domain/graphics.ts';
import { percentage, positive, ratio } from '../shared/normalise.ts';
import { numericText, type FileAccess } from './FileAccess.ts';

interface DrmSample {
  readonly bus: string;
  readonly usage: number | null;
  readonly total: number | null;
  readonly used: number | null;
}

/** Adds driver-provided DRM counters, matched by PCI address rather than order. */
export class LinuxGraphics {
  constructor(private readonly files: FileAccess, private readonly root = '/sys/class/drm') {}

  public async enrich(gpus: readonly GpuMetrics[]): Promise<readonly GpuMetrics[]> {
    const entries = (await this.files.list(this.root)).filter(name => /^card\d+$/.test(name));
    const samples = await Promise.all(entries.map(entry => this.read(entry)));
    return gpus.map(gpu => this.merge(gpu, samples));
  }

  private async read(entry: string): Promise<DrmSample> {
    const device = `${this.root}/${entry}/device`;
    const [path, usage, total, used] = await Promise.all([
      this.files.resolve(device), this.files.text(`${device}/gpu_busy_percent`),
      this.files.text(`${device}/mem_info_vram_total`), this.files.text(`${device}/mem_info_vram_used`),
    ]);
    return { bus: basename(path ?? ''), usage: percentage(numericText(usage)), total: positive(numericText(total)), used: numericText(used) };
  }

  private merge(gpu: GpuMetrics, samples: readonly DrmSample[]): GpuMetrics {
    const sample = samples.find(item => this.address(item.bus) === this.address(gpu.bus));
    if (sample === undefined || sample.bus === '') return gpu;
    const memoryUsed = gpu.memoryUsed ?? sample.used;
    const memoryTotal = gpu.memoryTotal ?? sample.total;
    return { ...gpu, usage: gpu.usage ?? sample.usage, memoryUsed, memoryTotal, memoryUsage: ratio(memoryUsed, memoryTotal) };
  }

  private address(bus: string): string { return bus.toLowerCase().replace(/^0{4,8}:/, ''); }
}
