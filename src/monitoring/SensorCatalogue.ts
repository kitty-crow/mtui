import type { SensorMetric } from '../domain/sensors.ts';
import type { ReadingStatus, Snapshot } from '../domain/snapshot.ts';

export interface ReportedSensor extends SensorMetric {
  readonly status: ReadingStatus;
  readonly updatedAt: number | null;
  readonly message: string | null;
}

/** A single catalogue feeds both the sensor screen and JSON endpoints. */
export class SensorCatalogue {
  public list(snapshot: Snapshot): readonly ReportedSensor[] {
    const { cpu, graphics, sensors } = snapshot.readings;
    const reported: ReportedSensor[] = (sensors.value ?? []).map(sensor => ({ ...sensor, status: sensors.status, updatedAt: sensors.updatedAt, message: sensors.message }));
    if (cpu.value !== null) reported.push({
      id: 'cpu:package', label: 'Processor package', device: cpu.value.model,
      value: cpu.value.temperature, unit: '°C', source: 'Processor collector', status: cpu.status, updatedAt: cpu.updatedAt, message: cpu.message,
    });
    for (const [index, value] of (cpu.value?.coreTemperatures ?? []).entries()) reported.push({
      id: `cpu:sensor:${index}`, label: `Reported core sensor ${index}`, device: cpu.value?.model ?? 'Processor',
      value, unit: '°C', source: 'Processor collector', status: cpu.status, updatedAt: cpu.updatedAt, message: cpu.message,
    });
    for (const gpu of graphics.value ?? []) {
      reported.push({ id: `gpu:${gpu.id}:temp`, label: 'GPU temperature', device: gpu.model, value: gpu.temperature, unit: '°C', source: 'Graphics collector', status: graphics.status, updatedAt: graphics.updatedAt, message: graphics.message });
      reported.push({ id: `gpu:${gpu.id}:fan`, label: 'GPU fan duty', device: gpu.model, value: gpu.fanPercent, unit: '%', source: 'Graphics collector', status: graphics.status, updatedAt: graphics.updatedAt, message: graphics.message });
      reported.push({ id: `gpu:${gpu.id}:memory-temp`, label: 'GPU memory temperature', device: gpu.model, value: gpu.memoryTemperature, unit: '°C', source: 'Graphics collector', status: graphics.status, updatedAt: graphics.updatedAt, message: graphics.message });
    }
    return reported.map(sensor => this.withAvailability(sensor));
  }

  private withAvailability(sensor: ReportedSensor): ReportedSensor {
    if (sensor.value !== null || sensor.status === 'waiting') return sensor;
    return { ...sensor, status: 'unavailable', updatedAt: null, message: sensor.message ?? 'No reading exposed by the active sensor providers' };
  }
}
