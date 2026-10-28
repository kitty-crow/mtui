import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { ratio } from '../../collectors/shared/normalise.ts';
import { ModuleColumns } from '../memory/ModuleColumns.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { Panel } from '../components/Panel.tsx';
import { Gauge } from '../components/Gauge.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette } from '../theme/palette.ts';

export class MemoryScreen extends PureComponent<ScreenProps> {
  private readonly columns = new ModuleColumns();
  public override render(): ReactNode {
    const { snapshot, width, height, ascii, offset } = this.props;
    const reading = snapshot.readings.memory;
    const ram = reading.value;
    return <Box flexDirection="column" height={height}>
      <Panel title="MEMORY ALLOCATION" accent={palette.memory} hint={reading.status} height={9} ascii={ascii}>
        {ram === null ? <ReadingNotice reading={reading} /> : <>
          <Text bold color={palette.text}>Used {F.bytes(ram.active)} / {F.bytes(ram.total)} · {F.percent(ratio(ram.active, ram.total))}</Text>
          <Gauge value={ratio(ram.active, ram.total)} width={width - 4} colour={palette.memory} ascii={ascii} />
          <Text color={palette.muted}>Available {F.bytes(ram.available)} · Free {F.bytes(ram.free)} · Cache {F.bytes(ram.cached)}</Text>
          <Text color={palette.muted}>Swap {F.bytes(ram.swapUsed)} / {F.bytes(ram.swapTotal)} · {ram.swapTotal === 0 ? 'Not configured' : F.percent(ratio(ram.swapUsed, ram.swapTotal))}</Text>
          <Gauge value={ratio(ram.swapUsed, ram.swapTotal)} width={width - 4} colour={palette.sensors} ascii={ascii} />
          <Text color={palette.faint}>Available memory includes reclaimable cache. Values use binary units.</Text>
        </>}
      </Panel>
      <Panel title="INSTALLED MODULES" accent={palette.memory} hint={ram?.modules.length ? `${ram.modules.length} reported` : 'unavailable'} height={height - 9} ascii={ascii}>
        {(ram?.modules.length ?? 0) > 0 ? <DataTable rows={ram?.modules ?? []} columns={this.columns.build(width - 4)} rowKey={(module, index) => `${module.bank}:${index}`} offset={offset} limit={Math.max(1, height - 15)} /> : <Text color={palette.muted}>{ram?.inventoryMessage ?? 'Module inventory is not available from this host.'}</Text>}
        <Box flexGrow={1} />
        <Text color={palette.faint}>Reported DIMM temperatures appear in Sensors when available.</Text>
      </Panel>
    </Box>;
  }
}
