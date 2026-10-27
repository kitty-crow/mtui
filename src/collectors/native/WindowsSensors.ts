import type { SensorMetric } from '../../domain/sensors.ts';
import type { CommandRunner } from './CommandRunner.ts';
import type { SensorSource } from './SensorSource.ts';
import { WindowsSensorMapper } from '../windows/WindowsSensorMapper.ts';
const query = `
$ErrorActionPreference = 'Stop'
foreach ($namespace in @('root/LibreHardwareMonitor', 'root/OpenHardwareMonitor')) {
  try {
    $values = @(Get-CimInstance -Namespace $namespace -ClassName Sensor | Select-Object Identifier, Name, Parent, SensorType, Value)
    if ($values.Count -eq 0) { continue }
    [Console]::Out.Write((ConvertTo-Json -InputObject $values -Compress -Depth 3))
    exit 0
  } catch { continue }
}
[Console]::Error.Write('CPU/board sensors: no active LibreHardwareMonitor or OpenHardwareMonitor WMI provider')
exit 1
`;

/** Consumes optional WMI providers without starting services or elevating rights. */
export class WindowsSensors implements SensorSource {
  constructor(private readonly runner: CommandRunner) {}

  public async read(): Promise<readonly SensorMetric[]> {
    const output = await this.runner.run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', query])
      .catch(() => { throw new Error('No accessible Windows hardware-monitor WMI provider'); });
    const data: unknown = JSON.parse(output.replace(/^\uFEFF/, ''));
    return new WindowsSensorMapper().map(data, 'Windows WMI');
  }
}
