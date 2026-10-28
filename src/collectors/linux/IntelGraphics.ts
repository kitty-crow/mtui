import type { GpuMetrics } from '../../domain/graphics.ts';
import type { IntelSampleSource } from './IntelGpuSampler.ts';
import { IntelTelemetryParser } from './IntelTelemetryParser.ts';

/** Intel PMU data complements sysfs identity and clocks, never CPU substitutes. */
export class IntelGraphics {
  constructor(private readonly source: IntelSampleSource) {}

  public async enrich(gpu: GpuMetrics, card: string): Promise<GpuMetrics> {
    const text = await this.source.read(card).catch(() => '');
    const sample = new IntelTelemetryParser().parse(text);
    return {
      ...gpu, usage: gpu.usage ?? sample?.usage ?? null,
      coreClock: gpu.coreClock ?? sample?.coreClock ?? null,
      power: gpu.power ?? sample?.power ?? null,
      telemetryMessage: gpu.usage !== null || sample?.usage != null ? null : 'Intel load unavailable: install intel-gpu-tools and authorise performance-counter access with sudo -v before launching.',
    };
  }
}
