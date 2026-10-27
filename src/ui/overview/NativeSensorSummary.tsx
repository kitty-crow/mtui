import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { Panel } from '../components/Panel.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette } from '../theme/palette.ts';
import { SensorCatalogue } from '../../monitoring/SensorCatalogue.ts';

/** The overview uses spare rows for platform sensors rather than empty space. */
export class NativeSensorSummary extends PureComponent<ScreenProps> {
  public override render(): ReactNode {
    const { snapshot, height, width, ascii } = this.props;
    const reading = snapshot.readings.sensors;
    const sensors = new SensorCatalogue().list(snapshot).filter(sensor => sensor.value !== null);
    const visible = sensors.slice(0, Math.max(0, (height - 4) * 2));
    const rows = Array.from({ length: Math.ceil(visible.length / 2) }, (_, index) => visible.slice(index * 2, index * 2 + 2));
    return <Panel title="THERMALS & COOLING" accent={palette.sensors} hint={`${sensors.length} extra readings · view 5 for all`} height={height} ascii={ascii}>
      {rows.map((row, index) => <Box key={index}>
        {row.map(sensor => <Box key={sensor.id} width={Math.floor((width - 4) / 2)}><Text color={palette.muted} wrap="truncate-end">{F.label(sensor.label)} <Text color={palette.sensors}>{F.value(sensor.value, sensor.unit, sensor.unit === 'V' ? 2 : 0)}</Text></Text></Box>)}
      </Box>)}
      <ReadingNotice reading={reading} empty={sensors.length === 0 ? 'No additional hardware sensors reported.' : undefined} />
    </Panel>;
  }
}
