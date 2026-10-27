import { PureComponent, type ReactNode } from 'react';
import { Text } from 'ink';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette, temperatureColour } from '../theme/palette.ts';
import { Panel } from '../components/Panel.tsx';
import { Gauge } from '../components/Gauge.tsx';
import { Sparkline } from '../components/Sparkline.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';

export class CpuSummary extends PureComponent<ScreenProps> {
  public override render(): ReactNode {
    const { snapshot, history, width, ascii } = this.props;
    const reading = snapshot.readings.cpu;
    const cpu = reading.value;
    return <Panel title="PROCESSOR" accent={palette.cpu} hint={reading.status} height={9} ascii={ascii}>
      {cpu === null ? <ReadingNotice reading={reading} /> : <>
        <Text color={palette.muted} wrap="truncate-end">{F.label(cpu.model)}</Text>
        <Text bold color={palette.text}>{F.percent(cpu.usage)} <Text color={palette.faint}>total load</Text></Text>
        <Gauge value={cpu.usage} width={width - 4} colour={palette.cpu} ascii={ascii} />
        <Sparkline points={history.get('cpu.usage')} width={width - 4} colour={palette.cpu} ascii={ascii} />
        <Text color={temperatureColour(cpu.temperature)}>{F.temperature(cpu.temperature)} <Text color={palette.muted}> · {F.value(cpu.speed, 'GHz', 2)}</Text></Text>
        <Text color={palette.faint}>{cpu.physicalCores || '?'} cores · {cpu.logicalCores} threads</Text>
      </>}
    </Panel>;
  }
}
