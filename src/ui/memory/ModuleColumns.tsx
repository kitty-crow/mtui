import type { MemoryModule } from '../../domain/memory.ts';
import type { Column } from '../components/DataTable.tsx';
import { MetricFormat as F } from '../format/MetricFormat.ts';

export class ModuleColumns {
  public build(width: number): readonly Column<MemoryModule>[] {
    return [
      { title: 'BANK', width: width - 49, render: module => F.label(module.bank) },
      { title: 'TYPE', width: 10, render: module => F.label(module.type) },
      { title: 'CAPACITY', width: 12, render: module => F.bytes(module.size) },
      { title: 'REPORTED SPEED', width: 18, render: module => F.value(module.clockSpeed, 'MHz') },
      { title: 'ECC', width: 9, render: module => module.ecc === null ? 'N/A' : module.ecc ? 'Yes' : 'No' },
    ];
  }
}
