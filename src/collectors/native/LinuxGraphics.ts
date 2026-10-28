import { basename } from 'node:path';
import type { GpuMetrics } from '../../domain/graphics.ts';
import { nonNegative, percentage, positive, ratio } from '../shared/normalise.ts';
import { numericText, type FileAccess } from './FileAccess.ts';
import type { IntelGraphics } from '../linux/IntelGraphics.ts';

interface DrmSample {
  readonly card: string;
  readonly driver: string;
  readonly clock: number | null;
  readonly bus: string;
  readonly usage: number | null;
  readonly total: number | null;
  readonly used: number | null;
}

/** Adds driver-provided DRM counters, matched by PCI address rather than order. */
export class LinuxGraphics {
  constructor(private readonly files: FileAccess, private readonly root = '/sys/class/drm', private readonly intel: IntelGraphics | null = null) {}

  public async enrich(gpus: readonly GpuMetrics[]): Promise<readonly GpuMetrics[]> {
    const entries = (await this.files.list(this.root)).filter(name => /^card\d+$/.test(name));
    const samples = await Promise.all(entries.map(entry => this.read(entry)));
    return Promise.all(gpus.map(gpu => this.enrichOne(gpu, samples)));
  }

  private async read(entry: string): Promise<DrmSample> {
    const device = `${this.root}/${entry}/device`;
    const [path, usage, total, used, driver, clock, gtClock] = await Promise.all([
      this.files.resolve(device), this.files.text(`${device}/gpu_busy_percent`),
      this.files.text(`${device}/mem_info_vram_total`), this.files.text(`${device}/mem_info_vram_used`),
      this.files.resolve(`${device}/driver`), this.files.text(`${this.root}/${entry}/gt_act_freq_mhz`),
      this.files.text(`${this.root}/${entry}/gt/gt0/rps_act_freq_mhz`),
    ]);
    return { card: entry, driver: basename(driver ?? ''), clock: positive(numericText(clock)) ?? positive(numericText(gtClock)), bus: basename(path ?? ''), usage: percentage(numericText(usage)), total: positive(numericText(total)), used: nonNegative(numericText(used)) };
  }

  private async enrichOne(gpu: GpuMetrics, samples: readonly DrmSample[]): Promise<GpuMetrics> {
    const sample = samples.find(item => this.address(item.bus) === this.address(gpu.bus));
    const merged = this.merge(gpu, samples);
    if (sample === undefined && /intel/i.test(gpu.vendor)) return { ...merged, telemetryMessage: 'Intel graphics detected, but no matching DRM device is accessible. Check the active graphics driver and device permissions.' };
    if (this.intel === null || sample === undefined || !/^(i915|xe)$/.test(sample.driver)) return merged;
    return this.intel.enrich(merged, sample.card);
  }

  private merge(gpu: GpuMetrics, samples: readonly DrmSample[]): GpuMetrics {
    const sample = samples.find(item => this.address(item.bus) === this.address(gpu.bus));
    if (sample === undefined || sample.bus === '') return gpu;
    const memoryUsed = gpu.memoryUsed ?? sample.used;
    const memoryTotal = gpu.memoryTotal ?? sample.total;
    return { ...gpu, driver: gpu.driver === 'Unknown' ? sample.driver || gpu.driver : gpu.driver, coreClock: gpu.coreClock ?? sample.clock, usage: gpu.usage ?? sample.usage, memoryUsed, memoryTotal, memoryUsage: ratio(memoryUsed, memoryTotal) };
  }

  private address(bus: string): string { return bus.toLowerCase().replace(/^0{4,8}:/, ''); }
}
