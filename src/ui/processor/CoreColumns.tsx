import type { CpuCore } from '../../domain/cpu.ts';
import type { Column } from '../components/DataTable.tsx';
import { Gauge } from '../components/Gauge.tsx';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette } from '../theme/palette.ts';

export class CoreColumns {
  public build(width: number, ascii: boolean): readonly Column<CpuCore>[] {
    return [
      { title: 'THREAD', width: 8, render: core => String(core.id) },
      { title: 'LOAD', width: 9, render: core => F.percent(core.usage) },
      { title: 'UTILISATION', width: width - 46, render: core => <Gauge value={core.usage} width={width - 48} colour={palette.cpu} ascii={ascii} /> },
      { title: 'USER', width: 9, render: core => F.percent(core.user) },
      { title: 'KERNEL', width: 9, render: core => F.percent(core.system) },
      { title: 'CLOCK', width: 11, render: core => F.value(core.speed, 'GHz', 2) },
    ];
  }
}
