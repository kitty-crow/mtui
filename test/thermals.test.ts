import { describe, expect, test } from 'bun:test';
import { CpuSensors } from '../src/collectors/system/CpuSensors.ts';
import { SharedSensorSource } from '../src/collectors/native/SharedSensorSource.ts';
import { NvidiaTelemetry } from '../src/collectors/native/NvidiaTelemetry.ts';
import { DemoScenario } from '../src/collectors/demo/DemoScenario.ts';
import { SensorCatalogue } from '../src/monitoring/SensorCatalogue.ts';
import type { SensorMetric } from '../src/domain/sensors.ts';
import { demoMonitor } from './helpers/demo.ts';

const scenario = new DemoScenario();
const channel = (label: string, value: number | null, component: SensorMetric['component'] = 'cpu'): SensorMetric => ({
  id: label, label, value, component: component ?? 'other', device: 'Example hardware', unit: '°C', source: 'Example provider',
});

describe('portable CPU temperature projection', () => {
  test.each(['CPU Package', 'CPU (Tctl/Tdie)', 'Package id 0', 'Tdie'])('uses %s without exposing platform details to consumers', label => {
    const cpu = new CpuSensors().enrich({ ...scenario.cpu(), temperature: null }, [channel(label, 55), channel('Core 0', 52), channel('Core 1', 57), channel('CPU Package', 99, 'gpu')]);
    expect(cpu.temperature).toBe(55);
    expect(cpu.maxTemperature).toBe(57);
    expect(cpu.coreTemperatures).toEqual([52, 57]);
  });
  test('does not assign CCD or board temperatures to logical cores', () => {
    const cpu = { ...scenario.cpu(), temperature: null, coreTemperatures: [] };
    const result = new CpuSensors().enrich(cpu, [channel('CPU CCD1 (Tdie)', 61), channel('CPU Package', 98, 'other')]);
    expect(result.temperature).toBeNull();
    expect(result.maxTemperature).toBe(61);
    expect(result.coreTemperatures).toEqual([]);
    expect(new CpuSensors().enrich(cpu, [channel('CPU Package', null)])).toBe(cpu);
  });
  test('coalesces concurrent provider queries and reads fresh values on the next poll', async () => {
    let calls = 0;
    const source = new SharedSensorSource({ read: async () => { calls++; return [channel('CPU Package', calls)]; } });
    const [first, second] = await Promise.all([source.read(), source.read()]);
    expect(calls).toBe(1);
    expect(first).toEqual(second);
    expect((await source.read())[0]?.value).toBe(2);
  });
});

describe('optional NVIDIA thermal channels', () => {
  const csv = '0, NVIDIA Example, 0, 8192, 1024, 40, 0, 20, 200, 300, 500, 00000000:01:00.0\n1, NVIDIA Example, 30, 8192, 2048, 50, 35, 100, 200, 1200, 3000, 00000000:02:00.0';
  const gpu = (bus: string) => ({ ...scenario.graphics()[0]!, vendor: 'NVIDIA', bus, memoryTemperature: null });
  test('matches reversed adapters by PCI address and retains unsupported memory sensors as null', async () => {
    const xml = '<nvidia_smi_log><gpu id="00000000:01:00.0"><temperature><memory_temp>N/A</memory_temp></temperature></gpu><gpu id="00000000:02:00.0"><temperature><memory_temp>72 C</memory_temp></temperature></gpu></nvidia_smi_log>';
    const runner = { run: async (_executable: string, args: readonly string[]) => args.includes('-x') ? xml : csv };
    const result = await new NvidiaTelemetry(runner).enrich([gpu('0000:02:00.0'), gpu('0000:01:00.0')]);
    expect(result[0]).toMatchObject({ usage: 30, temperature: 50, memoryTemperature: 72 });
    expect(result[1]).toMatchObject({ usage: 0, temperature: 40, memoryTemperature: null });
  });
  test('keeps load and core temperature when the optional thermal query fails', async () => {
    const runner = { run: async (_executable: string, args: readonly string[]) => {
      if (args.includes('-x')) throw new Error('unsupported query');
      return csv;
    } };
    expect((await new NvidiaTelemetry(runner).enrich([gpu('0000:01:00.0')]))[0]).toMatchObject({ usage: 0, temperature: 40, memoryTemperature: null });
  });
});

test('unavailable scalar sensors are not advertised as live through the JSON catalogue', async () => {
  const { monitor } = await demoMonitor();
  const snapshot = monitor.getSnapshot();
  const cpu = snapshot.readings.cpu;
  const sensors = new SensorCatalogue().list({ ...snapshot, readings: { ...snapshot.readings, cpu: { ...cpu, value: cpu.value === null ? null : { ...cpu.value, temperature: null } } } });
  expect(sensors.find(sensor => sensor.id === 'cpu:package')).toMatchObject({ status: 'unavailable', updatedAt: null, value: null });
});
