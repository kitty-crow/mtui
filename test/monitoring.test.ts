import { describe, expect, test } from 'bun:test';
import { CollectorSlot } from '../src/monitoring/CollectorSlot.ts';
import { HistoryStore } from '../src/monitoring/HistoryStore.ts';
import { CachedQuery } from '../src/collectors/shared/CachedQuery.ts';
import { demoMonitor } from './helpers/demo.ts';

describe('collector isolation', () => {
  test('retains the original timestamp after a failed read', async () => {
    let fail = false;
    const slot = new CollectorSlot({ name: 'test', collect: async () => { if (fail) throw new Error('offline'); return 0; } });
    const good = await slot.sample(100);
    fail = true;
    const bad = await slot.sample(100);
    expect(good.value).toBe(0);
    expect(bad).toMatchObject({ value: 0, status: 'stale', updatedAt: good.updatedAt, message: 'offline' });
  });
  test('does not re-enter a timed-out provider and consumes its eventual result', async () => {
    let reads = 0;
    const gate = Promise.withResolvers<number>();
    const slot = new CollectorSlot({ name: 'slow', collect: () => { reads++; return gate.promise; } });
    expect((await slot.sample(5)).status).toBe('unavailable');
    expect((await slot.sample(5)).status).toBe('unavailable');
    expect(reads).toBe(1);
    gate.resolve(17);
    expect(await slot.sample(100)).toMatchObject({ status: 'live', value: 17 });
  });
  test('isolates synchronous collector exceptions', async () => {
    const slot = new CollectorSlot({ name: 'broken', collect: () => { throw new Error('bad driver'); } });
    expect(await slot.sample(100)).toMatchObject({ status: 'unavailable', value: null, message: 'bad driver' });
  });
  test('shares concurrent inventory reads and retries failures', async () => {
    let calls = 0;
    const cache = new CachedQuery(async () => { calls++; return 'inventory'; });
    expect(await Promise.all([cache.get(), cache.get(), cache.get()])).toEqual(['inventory', 'inventory', 'inventory']);
    expect(calls).toBe(1);
    let fail = true;
    const retry = new CachedQuery(async () => { if (fail) throw new Error('not ready'); return 42; });
    await expect(retry.get()).rejects.toThrow('not ready');
    fail = false;
    expect(await retry.get()).toBe(42);
  });
});

describe('monitor lifecycle', () => {
  test('coalesces manual refreshes and stops polling while paused', async () => {
    const { monitor, registry, scenario } = await demoMonitor();
    let calls = 0;
    const gate = Promise.withResolvers<ReturnType<typeof scenario.cpu>>();
    registry.register('cpu', { name: 'test', collect: () => { calls++; return gate.promise; } });
    const first = monitor.refresh();
    const second = monitor.refresh();
    expect(first).toBe(second);
    gate.resolve(scenario.cpu());
    await first;
    expect(calls).toBe(1);
    monitor.togglePause();
    const sequence = monitor.getSnapshot().sequence;
    await monitor.refresh();
    expect(monitor.getSnapshot().sequence).toBe(sequence);
    monitor.setInterval(0);
    expect(monitor.interval).toBe(250);
    monitor.setInterval(20_000);
    expect(monitor.interval).toBe(10_000);
    monitor.stop();
  });
  test('publishes subscriptions and lets removed providers become unavailable', async () => {
    const { monitor, registry } = await demoMonitor();
    let notices = 0;
    const unsubscribe = monitor.subscribe(() => { notices++; });
    registry.remove('memory');
    await monitor.refresh();
    unsubscribe();
    expect(notices).toBe(1);
    expect(monitor.getSnapshot().readings.memory.status).toBe('unavailable');
  });
});

describe('bounded chart histories', () => {
  test('keeps immutable, bounded series and records failures as gaps', async () => {
    const { monitor } = await demoMonitor();
    const history = new HistoryStore(3);
    const snapshot = monitor.getSnapshot();
    history.record(snapshot);
    const original = history.get('cpu.usage');
    history.record(snapshot);
    expect(history.get('cpu.usage')).not.toBe(original);
    expect(original.length).toBe(1);
    history.record(snapshot);
    history.record({ ...snapshot, readings: { ...snapshot.readings, cpu: { ...snapshot.readings.cpu, status: 'stale' } } });
    expect(history.get('cpu.usage').length).toBe(3);
    expect(history.get('cpu.usage').at(-1)?.value).toBeNull();
  });
  test('prunes removed GPUs and never joins different device histories', async () => {
    const { monitor } = await demoMonitor();
    const history = new HistoryStore(3);
    const snapshot = monitor.getSnapshot();
    history.record(snapshot);
    expect(history.get('gpu.demo:0.usage').length).toBe(1);
    history.record({ ...snapshot, readings: { ...snapshot.readings, graphics: { ...snapshot.readings.graphics, value: [] } } });
    expect(history.get('gpu.demo:0.usage')).toEqual([]);
    expect(history.get('cpu.usage').length).toBe(2);
  });
});
