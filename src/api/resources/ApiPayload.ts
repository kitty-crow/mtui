import type { HostIdentity, Snapshot } from '../../domain/snapshot.ts';

export interface MonitorIdentity {
  readonly host: HostIdentity;
  readonly demo: boolean;
  readonly version: string;
}

/** Versioned wire contract used by API consumers and the remote terminal. */
export interface ApiPayload extends MonitorIdentity {
  readonly schemaVersion: 1;
  readonly product: 'mTUI';
  readonly intervalMs: number;
  readonly paused: boolean;
  readonly snapshot: Snapshot;
}
