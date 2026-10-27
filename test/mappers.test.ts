import { describe, expect, test } from 'bun:test';
import type { Systeminformation } from 'systeminformation';
import { GraphicsMapper } from '../src/collectors/system/GraphicsMapper.ts';
import { MemoryMapper } from '../src/collectors/system/MemoryMapper.ts';
import { CpuMapper } from '../src/collectors/system/CpuMapper.ts';
import { percentage, temperature } from '../src/collectors/shared/normalise.ts';

const graphics: Systeminformation.GraphicsControllerData = { vendor: 'Example', model: 'GPU', bus: 'PCIe', vram: 8192, vramDynamic: false };
const memory: Systeminformation.MemData = { total: 16384, active: 4096, available: 12288, free: 2048, used: 14336, buffcache: 10240, buffers: 0, cached: 10240, slab: 0, reclaimable: 0, swaptotal: 8192, swapused: 0, swapfree: 8192, writeback: 0, dirty: 0 };

describe('hardware normalisation', () => {
  test('preserves stopped fans and idle GPUs, rejects driver sentinels', () => {
    const data = new GraphicsMapper().map({ ...graphics, utilizationGpu: 0, fanSpeed: 0, temperatureGpu: -1, powerDraw: 0, clockCore: 0 }, 0);
    expect(data).toMatchObject({ usage: 0, fanPercent: 0, power: 0, temperature: null, coreClock: null });
    expect(temperature(0)).toBeNull();
    expect(percentage(NaN)).toBeNull();
    expect(percentage(101)).toBeNull();
  });
  test('converts SI graphics memory units and derives allocation, not memory-engine load', () => {
    const data = new GraphicsMapper().map({ ...graphics, memoryTotal: 8192, memoryUsed: 2048, utilizationMemory: 97, pciBus: '0000:02:00.0' }, 0);
    expect(data.memoryTotal).toBe(8192 * 1024 ** 2);
    expect(data.memoryUsage).toBe(25);
    expect(data.id).toBe('0000:02:00.0');
  });
  test('treats a zero capacity as unavailable and falls back to valid inventory', () => {
    const mapper = new GraphicsMapper();
    expect(mapper.map({ ...graphics, memoryTotal: 0 }, 0).memoryTotal).toBe(8192 * 1024 ** 2);
    expect(mapper.map({ ...graphics, vram: 0 }, 0).memoryTotal).toBeNull();
  });
  test('preserves the active/cache distinction and skips empty DIMM slots', () => {
    const module: Systeminformation.MemLayoutData = { size: 0, bank: 'A1', type: 'DDR5', clockSpeed: 5600, formFactor: 'DIMM', partNum: '', serialNum: '', voltageConfigured: null, voltageMin: null, voltageMax: null };
    const data = new MemoryMapper().map(memory, [module]);
    expect(data.active).toBe(4096);
    expect(data.cached).toBe(10240);
    expect(data.available).toBe(12288);
    expect(data.swapUsed).toBe(0);
    expect(data.modules).toEqual([]);
  });
  test('keeps logical cores independent of the number of temperature sensors', () => {
    const core: Systeminformation.CurrentLoadCpuData = { load: 0, loadUser: 0, loadSystem: 0, loadNice: 0, loadIdle: 100, loadIrq: 0, loadSteal: 0, loadGuest: 0, rawLoad: 0, rawLoadUser: 0, rawLoadSystem: 0, rawLoadNice: 0, rawLoadIdle: 0, rawLoadIrq: 0, rawLoadSteal: 0, rawLoadGuest: 0 };
    const load: Systeminformation.CurrentLoadData = { avgLoad: 0, currentLoad: 0, currentLoadUser: 0, currentLoadSystem: 0, currentLoadNice: 0, currentLoadIdle: 100, currentLoadIrq: 0, currentLoadSteal: 0, currentLoadGuest: 0, rawCurrentLoad: 0, rawCurrentLoadUser: 0, rawCurrentLoadSystem: 0, rawCurrentLoadNice: 0, rawCurrentLoadIdle: 0, rawCurrentLoadIrq: 0, rawCurrentLoadSteal: 0, rawCurrentLoadGuest: 0, cpus: [core, core] };
    const data = new CpuMapper().map(load, null, null, { main: 45, max: 46, cores: [45] });
    expect(data.cores).toHaveLength(2);
    expect(data.coreTemperatures).toEqual([45]);
    expect(data.cores[0]?.usage).toBe(0);
    expect(data.cores[0]?.speed).toBeNull();
  });
});
