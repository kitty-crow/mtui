import type { SensorMetric, SensorUnit } from '../../domain/sensors.ts';
import type { CommandRunner } from './CommandRunner.ts';
import type { SensorSource } from './SensorSource.ts';

const units: Readonly<Record<string, SensorUnit>> = { Temperature: '°C', Fan: 'RPM', Voltage: 'V', Power: 'W', Control: '%' };
const query = `
$ErrorActionPreference = 'Stop'
foreach ($namespace in @('root/LibreHardwareMonitor', 'root/OpenHardwareMonitor')) {
  try {
    $values = @(Get-CimInstance -Namespace $namespace -ClassName Sensor | Select-Object Identifier, Name, Parent, SensorType, Value)
    [Console]::Out.Write((ConvertTo-Json -InputObject $values -Compress -Depth 3))
    exit 0
  } catch { continue }
}
[Console]::Error.Write('No accessible LibreHardwareMonitor or OpenHardwareMonitor WMI provider')
exit 1
`;

/** Consumes optional WMI providers without starting services or elevating rights. */
export class WindowsSensors implements SensorSource {
  constructor(private readonly runner: CommandRunner) {}

  public async read(): Promise<readonly SensorMetric[]> {
    const output = await this.runner.run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', query]);
    const data: unknown = JSON.parse(output.replace(/^\uFEFF/, ''));
    const records: unknown[] = Array.isArray(data) ? data : [data];
    return records.flatMap(record => this.map(record));
  }

  private map(record: unknown): SensorMetric[] {
    if (typeof record !== 'object' || record === null) return [];
    const data = record as Record<string, unknown>;
    const unit = typeof data['SensorType'] === 'string' ? units[data['SensorType']] : undefined;
    if (unit === undefined || typeof data['Identifier'] !== 'string') return [];
    const raw = data['Value'];
    return [{
      id: data['Identifier'], label: typeof data['Name'] === 'string' ? data['Name'] : data['Identifier'],
      device: typeof data['Parent'] === 'string' ? data['Parent'] : 'Hardware', unit,
      value: typeof raw === 'number' && Number.isFinite(raw) ? raw : null, source: 'Windows WMI',
    }];
  }
}
