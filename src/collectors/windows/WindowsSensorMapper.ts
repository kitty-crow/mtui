import type { SensorMetric, SensorUnit } from '../../domain/sensors.ts';

const units: Readonly<Record<string, SensorUnit>> = { Temperature: '°C', Fan: 'RPM', Voltage: 'V', Power: 'W', Control: '%' };

/** Shared mapping for optional WMI providers and the integrated library reader. */
export class WindowsSensorMapper {
  public map(records: unknown, source: string): readonly SensorMetric[] {
    return (Array.isArray(records) ? records : [records]).flatMap(record => this.sensor(record, source));
  }

  private sensor(record: unknown, source: string): SensorMetric[] {
    if (typeof record !== 'object' || record === null) return [];
    const data = record as Record<string, unknown>;
    const unit = typeof data['SensorType'] === 'string' ? units[data['SensorType']] : undefined;
    if (unit === undefined || typeof data['Identifier'] !== 'string') return [];
    const raw = data['Value'];
    return [{
      id: data['Identifier'], label: typeof data['Name'] === 'string' ? data['Name'] : data['Identifier'],
      device: typeof data['Parent'] === 'string' ? data['Parent'] : 'Hardware', unit,
      value: typeof raw === 'number' && Number.isFinite(raw) ? raw : null, source,
      component: data['Component'] === 'cpu' || /^\/(?:amdcpu|intelcpu|cpu)\//i.test(data['Identifier']) ? 'cpu' : 'other',
    }];
  }
}
