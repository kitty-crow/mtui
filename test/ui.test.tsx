import { describe, expect, test } from 'bun:test';
import { renderToString } from 'ink';
import { Dashboard } from '../src/ui/layout/Dashboard.tsx';
import { NavigationController, views } from '../src/ui/navigation/NavigationController.ts';
import { MetricFormat } from '../src/ui/format/MetricFormat.ts';
import { demoMonitor } from './helpers/demo.ts';

describe('terminal layout', () => {
  test.each([70, 80, 110, 160])('keeps every view within %i columns at short and tall heights', async width => {
    const { monitor, identity } = await demoMonitor();
    for (const height of [24, 32, 45]) {
      for (const view of views) {
        const output = renderToString(<Dashboard snapshot={monitor.getSnapshot()} history={monitor.history} identity={identity} navigation={{ view, offset: 0, gpuIndex: 0, help: false }} width={width} height={height} offset={0} gpuIndex={0} interval={1000} paused={false} motion={false} ascii={false} remote={null} endpoint="http://0.0.0.0:9700" />, { columns: width });
        const lines = Bun.stripANSI(output).split('\n');
        expect(lines.length, `${view} at ${width}×${height}`).toBeLessThanOrEqual(height);
        expect(Math.max(...lines.map(line => Bun.stringWidth(line))), `${view} at ${width}×${height}`).toBeLessThanOrEqual(width);
        expect(output).toContain('Q quit');
        expect(output).toContain('DEMO');
        if (view === 'processor') expect(output).toContain('Temperature sensors are listed separately');
      }
    }
  });
  test('renders the requested GPU table fields and plain ASCII borders', async () => {
    const { monitor, identity } = await demoMonitor();
    const navigation = new NavigationController().getState();
    const output = renderToString(<Dashboard snapshot={monitor.getSnapshot()} history={monitor.history} identity={identity} navigation={navigation} width={110} height={32} offset={0} gpuIndex={0} interval={1000} paused={false} motion={false} ascii={true} remote={null} endpoint={null} />, { columns: 110 });
    for (const label of ['LOAD', 'VRAM USED / TOTAL', 'TEMP', 'FAN %', 'POWER', 'Example Discrete GPU']) expect(output).toContain(label);
    expect(output).toContain('+---');
    expect(output).not.toContain('╭');
  });
  test('provides a small-terminal fallback and readable unknown values', async () => {
    const { monitor, identity } = await demoMonitor();
    const navigation = new NavigationController().getState();
    const output = renderToString(<Dashboard snapshot={monitor.getSnapshot()} history={monitor.history} identity={identity} navigation={navigation} width={45} height={12} offset={0} gpuIndex={0} interval={1000} paused={false} motion={false} ascii={false} remote={null} endpoint={null} />, { columns: 45 });
    expect(output).toContain('Resize to at least');
    expect(MetricFormat.percent(null)).toBe('N/A');
    expect(MetricFormat.percent(0)).toBe('0.0%');
    expect(MetricFormat.bytes(1024 ** 3)).toBe('1.0 GiB');
  });
  test('counts GPU sensor channels when the additional hardware provider is unavailable', async () => {
    const { monitor, identity } = await demoMonitor();
    const snapshot = monitor.getSnapshot();
    const graphics = snapshot.readings.graphics;
    const cpu = snapshot.readings.cpu;
    const data = { ...snapshot, readings: { ...snapshot.readings,
      sensors: { value: null, status: 'unavailable' as const, updatedAt: null, message: 'Hardware driver unavailable' },
      cpu: { ...cpu, value: cpu.value === null ? null : { ...cpu.value, temperature: null, coreTemperatures: [] } },
      graphics: { ...graphics, value: graphics.value?.map(gpu => ({ ...gpu, temperature: 40, memoryTemperature: null, fanPercent: 30 })) ?? null },
    } };
    const output = renderToString(<Dashboard snapshot={data} history={monitor.history} identity={identity} navigation={new NavigationController().getState()} width={110} height={32} offset={0} gpuIndex={0} interval={1000} paused={false} motion={false} ascii={false} remote={null} endpoint={null} />, { columns: 110 });
    expect(Bun.stripANSI(output)).toContain('2 temperatures · 2 fan channels');
    expect(output).toContain('Hardware driver unavailable');
  });
});

describe('navigation', () => {
  test('wraps tabs, clamps scrolling and selects GPUs independently', () => {
    const navigation = new NavigationController();
    navigation.cycle(-1);
    expect(navigation.getState().view).toBe('sensors');
    navigation.scroll(1000, 14);
    expect(navigation.getState().offset).toBe(14);
    navigation.select('graphics');
    navigation.selectGpu(1, 2);
    expect(navigation.getState().gpuIndex).toBe(1);
    navigation.selectGpu(100, 2);
    expect(navigation.getState().gpuIndex).toBe(1);
  });
});
