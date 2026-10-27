import type { GpuMetrics } from '../../domain/graphics.ts';
import type { Collector } from '../contracts/Collector.ts';
import type { LinuxGraphics } from '../native/LinuxGraphics.ts';
import { GraphicsMapper } from './GraphicsMapper.ts';
import type { SystemApi } from './SystemApi.ts';

/** Discovers all adapters; vendor driver tools are used by SI when available. */
export class GraphicsCollector implements Collector<readonly GpuMetrics[]> {
  public readonly name = 'Graphics';
  private readonly mapper = new GraphicsMapper();

  constructor(private readonly api: SystemApi, private readonly linux: LinuxGraphics | null = null) {}

  public async collect(): Promise<readonly GpuMetrics[]> {
    const data = await this.api.graphics();
    const gpus = data.controllers.map((controller, index) => this.mapper.map(controller, index));
    return this.linux === null ? gpus : this.linux.enrich(gpus);
  }
}
