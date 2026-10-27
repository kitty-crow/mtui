import { PureComponent, type ReactNode } from 'react';
import { Box } from 'ink';
import { GpuColumns } from '../graphics/GpuColumns.tsx';
import { GpuDetail } from '../graphics/GpuDetail.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { Panel } from '../components/Panel.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { palette } from '../theme/palette.ts';

export class GraphicsScreen extends PureComponent<ScreenProps> {
  private readonly columns = new GpuColumns();
  public override render(): ReactNode {
    const { snapshot, history, width, height, ascii, offset } = this.props;
    const reading = snapshot.readings.graphics;
    const gpus = reading.value ?? [];
    const selected = Math.max(0, Math.min(gpus.length - 1, this.props.gpuIndex));
    const topHeight = Math.min(8, Math.max(5, gpus.length + 4));
    const limit = Math.max(1, topHeight - (gpus.length > topHeight - 4 ? 5 : 4));
    return <Box flexDirection="column" height={height}>
      <Panel title="GRAPHICS ADAPTERS" accent={palette.graphics} hint={reading.status} height={topHeight} ascii={ascii}>
        {gpus.length > 0 ? <DataTable rows={gpus} columns={this.columns.build(width - 4)} rowKey={gpu => gpu.id} selected={selected} offset={offset} limit={limit} /> : <ReadingNotice reading={reading} empty="No graphics adapters reported." />}
      </Panel>
      <GpuDetail gpu={gpus[selected] ?? null} index={selected} width={width} height={height - topHeight} history={history} ascii={ascii} />
    </Box>;
  }
}
