import { DemoScenario } from '../../src/collectors/demo/DemoScenario.ts';
import { HistoryStore } from '../../src/monitoring/HistoryStore.ts';
import type { Reading, Snapshot } from '../../src/domain/snapshot.ts';

/** A repeatable two-minute simulated trace for documentation previews. */
export class PreviewScenario {
  public create(): { readonly snapshot: Snapshot; readonly history: HistoryStore } {
    const history = new HistoryStore(120);
    let snapshot: Snapshot | null = null;
    for (let index = 0; index < 120; index++) {
      const at = 1_793_095_200_000 - (119 - index) * 1000;
      const demo = new DemoScenario(() => at);
      snapshot = { sequence: index + 1, sampledAt: at, uptime: 90_000, readings: { cpu: this.reading(demo.cpu(), at), memory: this.reading(demo.memory(), at), graphics: this.reading(demo.graphics(), at), sensors: this.reading(demo.sensors(), at) } };
      history.record(snapshot);
    }
    if (snapshot === null) throw new Error('Preview scenario has no samples');
    return { snapshot, history };
  }

  private reading<T>(value: T, at: number): Reading<T> { return { value, status: 'live', updatedAt: at, message: null }; }
}
