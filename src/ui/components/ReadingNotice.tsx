import { PureComponent, type ReactNode } from 'react';
import { Text } from 'ink';
import type { Reading } from '../../domain/snapshot.ts';
import { MetricFormat } from '../format/MetricFormat.ts';
import { palette } from '../theme/palette.ts';

interface Props { readonly reading: Reading<unknown>; readonly empty?: string | undefined }

export class ReadingNotice extends PureComponent<Props> {
  public override render(): ReactNode {
    const { reading, empty } = this.props;
    if (reading.status === 'waiting') return <Text color={palette.muted}>Discovering hardware…</Text>;
    if (reading.status === 'stale') return <Text color={palette.warning} wrap="truncate-end">STALE · last good {new Date(reading.updatedAt ?? 0).toLocaleTimeString('en-GB')} · {MetricFormat.label(reading.message ?? '')}</Text>;
    if (reading.status === 'unavailable') return <Text color={palette.warning} wrap="truncate-end">{MetricFormat.label(reading.message ?? 'Telemetry unavailable')}</Text>;
    return empty ? <Text color={palette.muted}>{empty}</Text> : null;
  }
}
