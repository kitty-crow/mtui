import type { Key } from 'ink';
import type { MonitorEngine } from '../../monitoring/MonitorEngine.ts';
import { SensorCatalogue } from '../../monitoring/SensorCatalogue.ts';
import { NavigationController, views } from './NavigationController.ts';
import { OverviewLayout } from '../overview/OverviewLayout.ts';

/** Resolves keyboard intent without storing terminal or telemetry data in views. */
export class InputController {
  constructor(private readonly navigation: NavigationController, private readonly monitor: MonitorEngine) {}

  public handle(input: string, key: Key, bodyHeight: number): 'exit' | null {
    const lower = input.toLowerCase();
    if (lower === 'q' || key.ctrl && lower === 'c') return 'exit';
    if (input === '?') { this.navigation.toggleHelp(); return null; }
    if (key.escape) { this.navigation.dismissHelp(); return null; }
    if (this.navigation.getState().help) return null;
    if (/^[1-5]$/.test(input)) { this.navigation.select(views[Number(input) - 1] ?? 'overview'); return null; }
    if (key.tab) { this.navigation.cycle(key.shift ? -1 : 1); return null; }
    if (key.leftArrow || key.rightArrow) { this.navigation.selectGpu(key.rightArrow ? 1 : -1, this.monitor.getSnapshot().readings.graphics.value?.length ?? 0); return null; }
    const maximum = this.maximumOffset(bodyHeight);
    if (key.upArrow || lower === 'k') { this.navigation.scroll(-1, maximum); return null; }
    if (key.downArrow || lower === 'j') { this.navigation.scroll(1, maximum); return null; }
    if (key.pageUp || key.pageDown) { this.navigation.scroll((key.pageDown ? 1 : -1) * Math.max(1, bodyHeight - 11), maximum); return null; }
    if (key.home) { this.navigation.scroll(-Number.MAX_SAFE_INTEGER, maximum); return null; }
    if (lower === 'p') this.monitor.togglePause();
    if (lower === 'r') void this.monitor.refresh();
    if (input === '+' || input === '=') this.monitor.setInterval(this.monitor.interval - 250);
    if (input === '-') this.monitor.setInterval(this.monitor.interval + 250);
    return null;
  }

  private maximumOffset(height: number): number {
    const snapshot = this.monitor.getSnapshot();
    const graphics = snapshot.readings.graphics.value ?? [];
    const view = this.navigation.getState().view;
    if (view === 'overview') return Math.max(0, graphics.length - new OverviewLayout(height, graphics.length).tableRows);
    if (view === 'processor') return Math.max(0, (snapshot.readings.cpu.value?.cores.length ?? 0) - Math.max(1, height - 11));
    if (view === 'memory') return Math.max(0, (snapshot.readings.memory.value?.modules.length ?? 0) - Math.max(1, height - 14));
    if (view === 'sensors') return Math.max(0, new SensorCatalogue().list(snapshot).length - Math.max(1, height - 7));
    return Math.max(0, graphics.length - 3);
  }
}
