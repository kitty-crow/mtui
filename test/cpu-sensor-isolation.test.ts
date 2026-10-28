import { expect, test } from 'bun:test';
import { CpuCollector } from '../src/collectors/system/CpuCollector.ts';
import { SharedSensorSource } from '../src/collectors/native/SharedSensorSource.ts';
import type { SystemApi } from '../src/collectors/system/SystemApi.ts';
import type { SensorMetric } from '../src/domain/sensors.ts';

test('CPU metrics stay live while the independent hardware sensor reader is starting', async () => {
  const gate = Promise.withResolvers<readonly SensorMetric[]>();
  const sensors = new SharedSensorSource({ read: () => gate.promise });
  const pending = sensors.read();
  const api = {
    cpu: async () => ({ brand: 'Test CPU', manufacturer: 'Example', physicalCores: 16 }),
    currentLoad: async () => ({ currentLoad: 42, currentLoadUser: 10, currentLoadSystem: 32, cpus: [] }),
    cpuCurrentSpeed: async () => ({ avg: 3.5, cores: [] }),
    cpuTemperature: async () => ({ main: null, cores: [] }),
  } as unknown as SystemApi;
  const collector = new CpuCollector(api, sensors);
  const first = await collector.collect();
  expect(first).toMatchObject({ model: 'Test CPU', usage: 42, temperature: null });
  const packageTemperature: SensorMetric = {
    id: 'cpu-package', label: 'CPU Package', value: 59, device: 'CPU',
    component: 'cpu', unit: '°C', source: 'Test source',
  };
  gate.resolve([packageTemperature]);
  await pending;
  const second = await collector.collect();
  expect(second).toMatchObject({ usage: 42, temperature: 59 });
}, 1000);
