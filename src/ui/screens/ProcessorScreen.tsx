import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { CoreColumns } from '../processor/CoreColumns.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { Panel } from '../components/Panel.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette, temperatureColour } from '../theme/palette.ts';

export class ProcessorScreen extends PureComponent<ScreenProps> {
  private readonly columns = new CoreColumns();
  public override render(): ReactNode {
    const { snapshot, width, height, ascii, offset } = this.props;
    const reading = snapshot.readings.cpu;
    const cpu = reading.value;
    return <Box flexDirection="column" height={height}>
      <Panel title="PROCESSOR" accent={palette.cpu} hint={reading.status} height={6} ascii={ascii}>
        {cpu === null ? <ReadingNotice reading={reading} /> : <>
          <Text bold color={palette.text} wrap="truncate-end">{F.label(cpu.model)} · {cpu.physicalCores || '?'} cores / {cpu.logicalCores} threads</Text>
          <Text color={palette.cpu}>Load {F.percent(cpu.usage)} · User {F.percent(cpu.user)} · Kernel {F.percent(cpu.system)}</Text>
          <Text color={temperatureColour(cpu.temperature)}>Package {F.temperature(cpu.temperature)} · Hottest sensor {F.temperature(cpu.maxTemperature)} <Text color={palette.muted}>· {F.value(cpu.speed, 'GHz', 2)}</Text></Text>
        </>}
      </Panel>
      <Panel title="LOGICAL PROCESSORS" accent={palette.cpu} hint="↑ ↓ / PgUp PgDn" height={height - 6} ascii={ascii}>
        <DataTable rows={cpu?.cores ?? []} columns={this.columns.build(width - 4, ascii)} rowKey={core => String(core.id)} offset={offset} limit={Math.max(1, height - 11)} />
        <Box flexGrow={1} />
        <Text color={palette.faint}>Temperature sensors are listed separately in Sensors.</Text>
      </Panel>
    </Box>;
  }
}
