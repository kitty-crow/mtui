import type { GpuMetrics } from '../../domain/graphics.ts';
import type { Column } from '../components/DataTable.tsx';
import { MetricFormat as F } from '../format/MetricFormat.ts';

/** The compact table retains load, VRAM occupancy, temperature, fan and power. */
export class GpuColumns {
  public build(width: number): readonly Column<GpuMetrics>[] {
    const wide = width >= 90;
    const clocks = width >= 120;
    const vramWidth = wide ? 23 : 8;
    const modelWidth = width - 3 - 9 - vramWidth - 8 - 8 - 10 - (clocks ? 11 : 0);
    const columns: Column<GpuMetrics>[] = [
      { title: '#', width: 3, render: (_gpu, index) => String(index) },
      { title: 'GPU', width: modelWidth, render: gpu => F.label(gpu.model) },
      { title: 'LOAD', width: 9, render: gpu => F.percent(gpu.usage) },
      { title: wide ? 'VRAM USED / TOTAL' : 'VRAM %', width: vramWidth, render: gpu => wide ? `${F.bytes(gpu.memoryUsed)} / ${F.bytes(gpu.memoryTotal)}` : F.percent(gpu.memoryUsage) },
      { title: 'TEMP', width: 8, render: gpu => F.temperature(gpu.temperature) },
      { title: 'FAN %', width: 8, render: gpu => F.percent(gpu.fanPercent) },
      { title: 'POWER', width: 10, render: gpu => F.value(gpu.power, 'W') },
    ];
    if (clocks) columns.push({ title: 'CORE CLK', width: 11, render: gpu => F.value(gpu.coreClock, 'MHz') });
    return columns;
  }
}
