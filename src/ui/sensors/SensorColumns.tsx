import type { ReportedSensor } from '../../monitoring/SensorCatalogue.ts';
import type { Column } from '../components/DataTable.tsx';
import { MetricFormat as F } from '../format/MetricFormat.ts';

export class SensorColumns {
  public build(width: number): readonly Column<ReportedSensor>[] {
    const source = width >= 100;
    const columns: Column<ReportedSensor>[] = [
      { title: 'SENSOR', width: 23, render: sensor => F.label(sensor.label) },
      { title: 'DEVICE', width: width - 48 - (source ? 20 : 0), render: sensor => F.label(sensor.device) },
      { title: 'READING', width: 14, render: sensor => F.value(sensor.value, sensor.unit, sensor.unit === 'V' ? 2 : 0) },
      { title: 'STATUS', width: 11, render: sensor => sensor.status },
    ];
    if (source) columns.push({ title: 'SOURCE', width: 20, render: sensor => sensor.source });
    return columns;
  }
}
