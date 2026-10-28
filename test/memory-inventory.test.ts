import { describe, expect, test } from 'bun:test';
import type { Systeminformation } from 'systeminformation';
import { DmiMemoryParser } from '../src/collectors/linux/DmiMemoryParser.ts';
import { LinuxMemoryInventory } from '../src/collectors/linux/LinuxMemoryInventory.ts';
import { MemoryInventory } from '../src/collectors/system/MemoryInventory.ts';
import { MemoryCollector } from '../src/collectors/system/MemoryCollector.ts';
import { systemApi } from '../src/collectors/system/SystemApi.ts';
import { payloadSchema } from '../src/remote/PayloadSchema.ts';
import { MetricUnits } from '../src/api/routing/MetricUnits.ts';
import { demoMonitor } from './helpers/demo.ts';
import { renderToString, Text } from 'ink';
import { createElement } from 'react';
import { ModuleColumns } from '../src/ui/memory/ModuleColumns.tsx';

const device = (locator: string, speed = '2666 MT/s') => `Memory Device
\tSize: 8 GB
\tLocator: ${locator}
\tBank Locator: BANK 0
\tType: DDR4
\tForm Factor: SODIMM
\tManufacturer: Example
\tData Width: 64 bits
\tTotal Width: 64 bits
\tSpeed: 3200 MT/s
\tConfigured Memory Speed: ${speed}
`;
const firmware = `${device('DIMM_A1')}\n${device('DIMM_B1')}\nMemory Device\n\tSize: No Module Installed\n`;
const aggregate: Systeminformation.MemLayoutData = { size: 16 * 1024 ** 3, bank: '', type: '', clockSpeed: 0, formFactor: '', partNum: '', serialNum: '', ecc: null, voltageConfigured: null, voltageMin: null, voltageMax: null };

describe('physical memory inventory', () => {
  test('keeps identical modules separate, skips empty slots and prefers configured speed', () => {
    const modules = new DmiMemoryParser().parse(firmware);
    expect(modules).toHaveLength(2);
    expect(modules.map(module => module.bank)).toEqual(['DIMM_A1', 'DIMM_B1']);
    expect(modules[0]).toMatchObject({ size: 8 * 1024 ** 3, type: 'DDR4', clockSpeed: 2666, transferRate: 2666, ecc: false });
  });
  test('handles old speed labels, unknown speeds, ECC and large capacities', () => {
    const parser = new DmiMemoryParser();
    const old = device('DIMM1').replace('Configured Memory Speed', 'Configured Clock Speed').replace('Total Width: 64', 'Total Width: 72').replace('Size: 8 GB', 'Size: 32768 MB');
    expect(parser.parse(old)[0]).toMatchObject({ size: 32 * 1024 ** 3, clockSpeed: 2666, ecc: true });
    expect(parser.parse(device('DIMM1', 'Unknown').replace('3200 MT/s', 'Unknown'))[0]?.clockSpeed).toBeNull();
    expect(parser.parse('permission denied')).toEqual([]);
  });
  test('uses non-interactive firmware access when unprivileged reads fail', async () => {
    const calls: string[][] = [];
    const inventory = new LinuxMemoryInventory({ run: async (exe, args) => {
      calls.push([exe, ...args]);
      if (exe === 'sudo') return firmware;
      throw new Error('Permission denied');
    } });
    expect((await inventory.read()).modules).toHaveLength(2);
    expect(calls.at(-1)).toEqual(['sudo', '-n', '--', '/usr/sbin/dmidecode', '--type', '17']);
  });
  test('does not turn unavailable firmware data into a fictitious single module', async () => {
    const fallback = new LinuxMemoryInventory({ run: async () => { throw new Error('unavailable'); } });
    const result = await new MemoryInventory({ memLayout: async () => [aggregate] }, fallback).read();
    expect(result.modules).toEqual([]);
    expect(result.message).toContain('sudo -v');
  });
  test('preserves portable module discovery and avoids unnecessary host queries', async () => {
    const fallback = { read: async () => { throw new Error('must not run'); } };
    const result = await new MemoryInventory({ memLayout: async () => [{ ...aggregate, bank: 'A1', type: 'DDR5', clockSpeed: 5600 }] }, fallback).read();
    expect(result.modules[0]).toMatchObject({ bank: 'A1', transferRate: 5600 });
    expect(result.message).toBeNull();
  });
  test('inventory failure cannot hide live allocation counters', async () => {
    const collector = new MemoryCollector(systemApi, { read: async () => { throw new Error('missing firmware'); } });
    const memory = await collector.collect();
    expect(memory.total).toBeGreaterThan(0);
    expect(memory.modules).toEqual([]);
    await Bun.sleep(0);
    expect((await collector.collect()).inventoryMessage).toContain('failed');
  });
  test('a stalled firmware query does not stall RAM sampling or start duplicate discovery', async () => {
    let calls = 0;
    const inventory = { read: () => { calls++; return new Promise<never>(() => {}); } };
    const collector = new MemoryCollector(systemApi, inventory);
    const result = await Promise.race([collector.collect(), Bun.sleep(500).then(() => null)]);
    expect(result?.total).toBeGreaterThan(0);
    expect(result?.inventoryMessage).toContain('Discovering');
    await collector.collect();
    expect(calls).toBe(1);
  });
  test('DDR rates use MT/s in the table and scalar API', () => {
    const module = new DmiMemoryParser().parse(firmware)[0];
    expect(module).toBeDefined();
    if (!module) return;
    const cell = new ModuleColumns().build(100).find(column => column.title === 'REPORTED SPEED')?.render(module, 0);
    expect(renderToString(createElement(Text, {}, cell))).toContain('2666 MT/s');
    expect(new MetricUnits().forPath('ram', ['modules', '0', 'transferRate'])).toBe('MT/s');
  });
  test('remote validation retains inventory diagnostics and transfer rates', async () => {
    const { monitor, identity } = await demoMonitor();
    const snapshot = monitor.getSnapshot();
    const memory = snapshot.readings.memory.value;
    expect(memory).not.toBeNull();
    const payload = { schemaVersion: 1, product: 'mTUI', ...identity, intervalMs: 1000, paused: false,
      snapshot: { ...snapshot, readings: { ...snapshot.readings, memory: { ...snapshot.readings.memory,
        value: { ...memory, modules: new DmiMemoryParser().parse(firmware), inventoryMessage: 'Firmware inventory' },
      } } },
    };
    const parsed = payloadSchema.parse(payload);
    expect(parsed.snapshot.readings.memory.value?.modules).toHaveLength(2);
    expect(parsed.snapshot.readings.memory.value?.modules[1]?.transferRate).toBe(2666);
    expect(parsed.snapshot.readings.memory.value?.inventoryMessage).toBe('Firmware inventory');
  });
});
