import { describe, expect, test } from 'bun:test';
import { GraphicsMapper } from '../src/collectors/system/GraphicsMapper.ts';
import { LinuxGraphics } from '../src/collectors/native/LinuxGraphics.ts';
import { IntelGraphics } from '../src/collectors/linux/IntelGraphics.ts';
import { IntelGpuSampler } from '../src/collectors/linux/IntelGpuSampler.ts';
import { IntelTelemetryParser } from '../src/collectors/linux/IntelTelemetryParser.ts';
import { CapturedTimeoutRunner } from '../src/collectors/linux/CapturedTimeoutRunner.ts';
import { MemoryFiles } from './helpers/MemoryFiles.ts';
import { demoMonitor } from './helpers/demo.ts';
import { payloadSchema } from '../src/remote/PayloadSchema.ts';

const sample = (busy: number) => ({ frequency: { actual: 650, requested: 800, unit: 'MHz' }, power: { GPU: 2.5, Package: 28, unit: 'W' }, engines: { 'Render/3D/0': { busy }, 'Video/0': { busy: 40 } } });
const stream = JSON.stringify([sample(0), sample(25)]);
const integrated = () => new GraphicsMapper().map({ vendor: 'Intel Corporation', model: 'Xeon E3-1200 v3/4th Gen Core Processor Integrated Graphics Controller', bus: 'Onboard', busAddress: '00:02.0', vramDynamic: false, vram: 256 }, 0);

describe('integrated graphics', () => {
  test('recognises integrated memory without treating the PCI aperture as dedicated VRAM', () => {
    expect(integrated()).toMatchObject({ sharedMemory: true, memoryTotal: null, memoryUsage: null });
    const arc = new GraphicsMapper().map({ vendor: 'Intel', model: 'Arc A770', bus: 'PCIe', vramDynamic: false, vram: 16384 }, 0);
    expect(arc.sharedMemory).toBe(false);
    expect(arc.memoryTotal).toBe(16384 * 1024 ** 2);
    const iris = new GraphicsMapper().map({ vendor: 'Intel', model: 'Iris Xe MAX', bus: 'PCIe', vramDynamic: false, vram: 4096 }, 0);
    expect(iris.sharedMemory).toBe(false);
  });
  test('reads busiest-engine load, actual clock and GPU power without substituting package power', () => {
    expect(new IntelTelemetryParser().parse(stream)).toEqual({ usage: 40, coreClock: 650, power: 2.5 });
    const noPower = JSON.stringify([sample(0), { engines: { Render: { busy: 0 } }, power: { Package: 28, unit: 'W' } }]);
    expect(new IntelTelemetryParser().parse(noPower)).toEqual({ usage: 0, coreClock: null, power: null });
  });
  test('accepts interrupted arrays, ignores incomplete frames, and rejects a baseline alone', () => {
    const parser = new IntelTelemetryParser();
    expect(parser.parse(`${stream.slice(0, -1)}, {"frequency":`)).toMatchObject({ usage: 40 });
    expect(parser.parse(JSON.stringify([sample(0)]))).toBeNull();
    expect(parser.parse('Permission denied')).toBeNull();
    expect(parser.parse(JSON.stringify([sample(0), { engines: { Render: { busy: -1 } }, label: 'escaped " { }' }]))?.usage).toBeNull();
  });
  test('samples the selected DRM card and retries only through non-interactive sudo', async () => {
    const recorded: string[][] = [];
    const source = new IntelGpuSampler({ run: async (exe, args) => {
      recorded.push([exe, ...args]);
      if (exe === 'timeout') throw new Error('permission denied');
      return stream;
    } });
    expect(await source.read('card2')).toBe(stream);
    expect(recorded[0]).toContain('drm:/dev/dri/card2');
    expect(recorded[1]?.slice(0, 4)).toEqual(['sudo', '-n', '--', 'timeout']);
    await expect(source.read('card0;bad')).rejects.toThrow('Invalid DRM card');
  });
  test('matches the Intel DRM node by PCI address and fills driver and sysfs clock', async () => {
    const files = new MemoryFiles({ '/drm/card3/gt_act_freq_mhz': '450' }, { '/drm': ['card3', 'card3-HDMI-A-1'] }, { '/drm/card3/device': '/pci/0000:00:02.0', '/drm/card3/device/driver': '/drivers/i915' });
    let card = '';
    const intel = new IntelGraphics({ read: async value => { card = value; return stream; } });
    const gpus = await new LinuxGraphics(files, '/drm', intel).enrich([integrated()]);
    expect(card).toBe('card3');
    expect(gpus[0]).toMatchObject({ driver: 'i915', coreClock: 450, usage: 40, power: 2.5, sharedMemory: true, memoryTotal: null });
  });
  test('keeps unsupported sensors null and reports counter availability instead of zero', async () => {
    const intel = new IntelGraphics({ read: async () => { throw new Error('missing tool'); } });
    const gpu = await intel.enrich(integrated(), 'card0');
    expect(gpu).toMatchObject({ usage: null, temperature: null, memoryTemperature: null, fanPercent: null });
    expect(gpu.telemetryMessage).toContain('intel-gpu-tools');
  });
  test('remote payloads retain integrated identity and telemetry diagnostics', async () => {
    const { catalogue } = await demoMonitor();
    const payload = catalogue.payload();
    const gpu = { ...integrated(), telemetryMessage: 'Counter access unavailable' };
    const changed = { ...payload, snapshot: { ...payload.snapshot, readings: { ...payload.snapshot.readings, graphics: { ...payload.snapshot.readings.graphics, value: [gpu] } } } };
    expect(payloadSchema.parse(changed).snapshot.readings.graphics.value?.[0]).toMatchObject({ sharedMemory: true, telemetryMessage: gpu.telemetryMessage });
  });
});

describe('bounded counter process', () => {
  test.skipIf(process.platform !== 'linux' || Bun.which('timeout') === null)('retains JSON stdout after the timed sampling window and reaps the child', async () => {
    const source = 'process.on("SIGINT", () => process.exit(0)); process.stdout.write("sample-data"); setInterval(() => {}, 1000);';
    const output = await new CapturedTimeoutRunner().run('timeout', ['--signal=INT', '--kill-after=0.1s', '0.2s', process.execPath, '-e', source]);
    expect(output).toBe('sample-data');
    await expect(new CapturedTimeoutRunner().run(process.execPath, ['-e', 'process.exit(1)'])).rejects.toThrow('unavailable');
  });
});
