import { describe, expect, test } from 'bun:test';
import { LinuxSensors } from '../src/collectors/native/LinuxSensors.ts';
import { LinuxGraphics } from '../src/collectors/native/LinuxGraphics.ts';
import { WindowsSensors } from '../src/collectors/native/WindowsSensors.ts';
import { DemoScenario } from '../src/collectors/demo/DemoScenario.ts';
import { MemoryFiles } from './helpers/MemoryFiles.ts';

describe('Linux sensor files', () => {
  test('converts milli-Celsius, RPM and micro-watts without dropping zero', async () => {
    const files = new MemoryFiles({ '/hw/hwmon0/name': 'example', '/hw/hwmon0/temp1_input': '42000', '/hw/hwmon0/temp1_label': 'Package', '/hw/hwmon0/fan1_input': '0', '/hw/hwmon0/power1_average': '12500000', '/hw/hwmon0/in0_input': '1200' }, { '/hw': ['hwmon0'], '/hw/hwmon0': ['temp1_input', 'fan1_input', 'power1_average', 'in0_input', 'temp1_max'] });
    const data = await new LinuxSensors(files, '/hw').read();
    expect(data.map(sensor => [sensor.label, sensor.value, sensor.unit])).toEqual([['Package', 42, '°C'], ['fan1', 0, 'RPM'], ['power1', 12.5, 'W'], ['in0', 1.2, 'V']]);
  });
  test('marks an unreadable input null and tolerates no exposed devices', async () => {
    expect(await new LinuxSensors(new MemoryFiles({}), '/missing').read()).toEqual([]);
    const files = new MemoryFiles({}, { '/hw': ['hwmon2'], '/hw/hwmon2': ['temp1_input'] });
    expect((await new LinuxSensors(files, '/hw').read())[0]?.value).toBeNull();
  });
  test('matches DRM devices by PCI bus instead of list order', async () => {
    const files = new MemoryFiles({ '/drm/card2/device/gpu_busy_percent': '0', '/drm/card2/device/mem_info_vram_total': '8192', '/drm/card2/device/mem_info_vram_used': '2048' }, { '/drm': ['card2', 'card2-HDMI-A-1'] }, { '/drm/card2/device': '/pci/0000:02:00.0' });
    const gpu = { ...new DemoScenario().graphics()[0]!, usage: null, bus: '00000000:02:00.0', memoryTotal: null, memoryUsed: null };
    const result = await new LinuxGraphics(files, '/drm').enrich([gpu]);
    expect(result[0]).toMatchObject({ usage: 0, memoryTotal: 8192, memoryUsed: 2048, memoryUsage: 25 });
  });
});

describe('Windows WMI sensors', () => {
  test('handles a single sensor object and fixed PowerShell arguments', async () => {
    let command: readonly string[] = [];
    const source = new WindowsSensors({ run: async (executable, args) => { command = [executable, ...args]; return JSON.stringify({ Identifier: '/cpu/fan/0', Parent: '/cpu', Name: 'CPU fan', SensorType: 'Fan', Value: 0 }); } });
    expect((await source.read())[0]).toMatchObject({ value: 0, unit: 'RPM', source: 'Windows WMI' });
    expect(command.slice(0, 4)).toEqual(['powershell.exe', '-NoLogo', '-NoProfile', '-NonInteractive']);
  });
  test('ignores unsupported types and handles invalid values', async () => {
    const source = new WindowsSensors({ run: async () => JSON.stringify([{ Identifier: '/cpu/temp', SensorType: 'Temperature', Value: null }, { Identifier: '/clock', SensorType: 'Clock', Value: 1234 }, null]) });
    expect(await source.read()).toMatchObject([{ value: null, unit: '°C' }]);
  });
  test('propagates provider failures to freshness handling', async () => {
    await expect(new WindowsSensors({ run: async () => { throw new Error('provider unavailable'); } }).read()).rejects.toThrow('provider unavailable');
  });
});
