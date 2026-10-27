import type { SensorMetric, SensorUnit } from '../../domain/sensors.ts';
import { numericText, type FileAccess } from './FileAccess.ts';
import type { SensorSource } from './SensorSource.ts';

interface SensorKind { readonly pattern: RegExp; readonly unit: SensorUnit; readonly scale: number }
const kinds: readonly SensorKind[] = [
  { pattern: /^temp\d+_input$/, unit: '°C', scale: 1000 },
  { pattern: /^fan\d+_input$/, unit: 'RPM', scale: 1 },
  { pattern: /^in\d+_input$/, unit: 'V', scale: 1000 },
  { pattern: /^power\d+_average$/, unit: 'W', scale: 1_000_000 },
];

/** Reads existing hwmon files only; it never probes buses or changes controls. */
export class LinuxSensors implements SensorSource {
  constructor(private readonly files: FileAccess, private readonly root = '/sys/class/hwmon') {}

  public async read(): Promise<readonly SensorMetric[]> {
    const devices = (await this.files.list(this.root)).filter(name => /^hwmon\d+$/.test(name));
    const groups = await Promise.all(devices.map(device => this.device(device)));
    return groups.flat();
  }

  private async device(device: string): Promise<readonly SensorMetric[]> {
    const path = `${this.root}/${device}`;
    const [name, entries] = await Promise.all([this.files.text(`${path}/name`), this.files.list(path)]);
    const sensors = entries.flatMap(file => {
      const kind = kinds.find(item => item.pattern.test(file));
      return kind === undefined ? [] : [{ file, kind }];
    });
    return Promise.all(sensors.map(({ file, kind }) => this.sensor(path, name || device, file, kind)));
  }

  private async sensor(path: string, device: string, file: string, kind: SensorKind): Promise<SensorMetric> {
    const stem = file.replace(/_(input|average)$/, '');
    const [input, label] = await Promise.all([this.files.text(`${path}/${file}`), this.files.text(`${path}/${stem}_label`)]);
    const raw = numericText(input);
    return {
      id: `${path}/${file}`, label: label || stem, device,
      value: raw === null ? null : raw / kind.scale, unit: kind.unit, source: 'Linux hwmon',
    };
  }
}
