import type { CpuMetrics } from '../../domain/cpu.ts';
import type { SensorMetric } from '../../domain/sensors.ts';
import { temperature } from '../shared/normalise.ts';

/** Maps hardware-provider CPU channels without mistaking board or GPU sensors for CPU cores. */
export class CpuSensors {
  public enrich(cpu: CpuMetrics, sensors: readonly SensorMetric[]): CpuMetrics {
    const channels = sensors.filter(sensor => sensor.unit === '°C' && sensor.component === 'cpu' && temperature(sensor.value) !== null);
    if (channels.length === 0) return cpu;
    const packageSensor = channels.find(sensor => /^(?:CPU Package|Package id \d+|CPU \(Tctl\/Tdie\)|CPU Die \(average\)|Tdie|Tctl)$/i.test(sensor.label));
    const cores = channels.filter(sensor => /^(?:CPU )?Core #?\d+/i.test(sensor.label)).map(sensor => sensor.value as number);
    return {
      ...cpu,
      temperature: packageSensor?.value ?? cpu.temperature,
      maxTemperature: Math.max(...channels.map(sensor => sensor.value as number)),
      coreTemperatures: cores.length > 0 ? cores : cpu.coreTemperatures,
    };
  }
}
