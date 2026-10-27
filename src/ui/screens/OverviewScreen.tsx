import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { CpuSummary } from '../overview/CpuSummary.tsx';
import { MemorySummary } from '../overview/MemorySummary.tsx';
import { NativeSensorSummary } from '../overview/NativeSensorSummary.tsx';
import { OverviewLayout } from '../overview/OverviewLayout.ts';
import { GpuColumns } from '../graphics/GpuColumns.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { Panel } from '../components/Panel.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { palette } from '../theme/palette.ts';
import { SensorCatalogue } from '../../monitoring/SensorCatalogue.ts';

export class OverviewScreen extends PureComponent<ScreenProps> {
  private readonly columns = new GpuColumns();
  public override render(): ReactNode {
    const { snapshot, width, height, ascii, offset } = this.props;
    const graphics = snapshot.readings.graphics;
    const gpus = graphics.value ?? [];
    const sensor = new SensorCatalogue().list(snapshot);
    const temperatures = sensor.filter(item => item.unit === '°C' && item.value !== null);
    const fans = sensor.filter(item => item.value !== null && (item.unit === 'RPM' || item.unit === '%' && /fan/i.test(item.label)));
    const leftWidth = Math.floor((width - 1) / 2);
    const { sensorHeight, gpuHeight, tableRows } = new OverviewLayout(height, gpus.length);
    return <Box flexDirection="column" height={height}>
      <Box height={9} columnGap={1} flexShrink={0}>
        <Box width={leftWidth}><CpuSummary {...this.props} width={leftWidth} /></Box>
        <Box width={width - leftWidth - 1}><MemorySummary {...this.props} width={width - leftWidth - 1} /></Box>
      </Box>
      <Panel title="GRAPHICS" accent={palette.graphics} hint={`${gpus.length} adapters · ${graphics.status}`} height={gpuHeight} ascii={ascii}>
        {gpus.length > 0 ? <DataTable rows={gpus} columns={this.columns.build(width - 4)} rowKey={gpu => gpu.id} offset={offset} limit={tableRows} /> : <ReadingNotice reading={graphics} empty="No graphics adapters reported by the operating system." />}
        <Box flexGrow={1} />
        <Text color={palette.sensors} wrap="truncate-end">SENSORS <Text color={palette.muted}>{temperatures.length} temperatures · {fans.length} fan channels</Text></Text>
        <Text color={palette.faint}>N/A = unavailable · fan % is duty, RPM is reported separately</Text>
      </Panel>
      {sensorHeight > 0 && <NativeSensorSummary {...this.props} height={sensorHeight} />}
    </Box>;
  }
}
