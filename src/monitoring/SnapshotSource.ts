import type { Snapshot } from '../domain/snapshot.ts';

/** Acquisition strategies let local and remote sessions share one lifecycle. */
export interface SnapshotSource {
  read(sequence: number): Promise<Snapshot>;
}
