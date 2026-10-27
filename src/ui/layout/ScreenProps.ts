import type { Snapshot } from '../../domain/snapshot.ts';
import type { HistoryStore } from '../../monitoring/HistoryStore.ts';

export interface ScreenProps {
  readonly snapshot: Snapshot;
  readonly history: HistoryStore;
  readonly width: number;
  readonly height: number;
  readonly offset: number;
  readonly gpuIndex: number;
  readonly ascii: boolean;
}
