import { PureComponent, type ReactNode } from 'react';
import { Text } from 'ink';
import { ratio } from '../../collectors/shared/normalise.ts';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette } from '../theme/palette.ts';
import { Panel } from '../components/Panel.tsx';
import { Gauge } from '../components/Gauge.tsx';
import { Sparkline } from '../components/Sparkline.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';

export class MemorySummary extends PureComponent<ScreenProps> {
  public override render(): ReactNode {
    const { snapshot, history, width, ascii } = this.props;
    const reading = snapshot.readings.memory;
    const ram = reading.value;
    return <Panel title="MEMORY" accent={palette.memory} hint={reading.status} height={9} ascii={ascii}>
      {ram === null ? <ReadingNotice reading={reading} /> : <>
        <Text color={palette.muted}>Active / installed</Text>
        <Text bold color={palette.text}>{F.bytes(ram.active)} <Text color={palette.faint}>/ {F.bytes(ram.total)}</Text></Text>
        <Gauge value={ratio(ram.active, ram.total)} width={width - 4} colour={palette.memory} ascii={ascii} />
        <Sparkline points={history.get('memory.usage')} width={width - 4} colour={palette.memory} ascii={ascii} />
        <Text color={palette.muted}>Available {F.bytes(ram.available)}</Text>
        <Text color={palette.faint}>Swap {F.bytes(ram.swapUsed)} / {F.bytes(ram.swapTotal)}</Text>
      </>}
    </Panel>;
  }
}
