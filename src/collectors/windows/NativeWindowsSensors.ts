import type { SensorMetric } from '../../domain/sensors.ts';
import type { SensorSource } from '../native/SensorSource.ts';
import { SensorAssets } from './SensorAssets.ts';
import { LineWorker } from './LineWorker.ts';
import { hardwareScript } from './HardwareScript.ts';
import { powershellArguments } from './PowerShell.ts';
import { WindowsSensorMapper } from './WindowsSensorMapper.ts';

export interface SensorWorker { read(): Promise<unknown>; close(): void }

/** Starts the library directly, without a desktop, WMI publisher or shell elevation. */
export class NativeWindowsSensors implements SensorSource {
  private worker: SensorWorker | null = null;
  private closed = false;

  constructor(
    private readonly assets: Pick<SensorAssets, 'library'> = new SensorAssets(),
    private readonly createWorker: (directory: string) => SensorWorker = directory => new LineWorker('powershell.exe', powershellArguments(hardwareScript), directory),
  ) {}

  public async read(): Promise<readonly SensorMetric[]> {
    const directory = await this.assets.library();
    if (this.closed) throw new Error('Sensor reader is closed');
    this.worker ??= this.createWorker(directory);
    const packet = await this.worker.read();
    if (typeof packet !== 'object' || packet === null || Array.isArray(packet)) throw new Error('Hardware sensor response is invalid');
    const data = packet as Record<string, unknown>;
    if (typeof data['error'] === 'string') throw new Error(data['error']);
    if (!Array.isArray(data['sensors'])) throw new Error('Hardware sensor response has no sensor list');
    return new WindowsSensorMapper().map(data['sensors'], 'LibreHardwareMonitor library');
  }

  public close(): void { this.closed = true; this.worker?.close(); }
}
