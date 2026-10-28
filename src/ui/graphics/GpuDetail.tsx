import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import type { GpuMetrics } from '../../domain/graphics.ts';
import type { HistoryStore } from '../../monitoring/HistoryStore.ts';
import { Panel } from '../components/Panel.tsx';
import { Sparkline } from '../components/Sparkline.tsx';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette, temperatureColour } from '../theme/palette.ts';

interface Props { readonly gpu: GpuMetrics | null; readonly index: number; readonly width: number; readonly height: number; readonly history: HistoryStore; readonly ascii: boolean }

export class GpuDetail extends PureComponent<Props> {
  public override render(): ReactNode {
    const { gpu, index, width, height, history, ascii } = this.props;
    return <Panel title="ADAPTER DETAILS" accent={palette.graphics} hint="← → select adapter" height={height} ascii={ascii}>
      {gpu === null ? <Text color={palette.muted}>No adapter available. Other system resources remain accessible.</Text> : <>
        <Text bold color={palette.text} wrap="truncate-end">{index} · {F.label(gpu.model)} <Text color={palette.muted}>({F.label(gpu.vendor)})</Text></Text>
        <Text color={palette.muted} wrap="truncate-end">BUS {F.label(gpu.bus)} · DRIVER {F.label(gpu.driver)}</Text>
        <Box columnGap={2}>
          <Box width="50%" flexDirection="column">
            <Text color={palette.graphics}>Load {F.percent(gpu.usage)} · Fan {F.percent(gpu.fanPercent)}</Text>
            <Text color={palette.muted}>Core {F.value(gpu.coreClock, 'MHz')} · Memory {F.value(gpu.memoryClock, 'MHz')}</Text>
            <Text color={palette.muted}>Power {F.value(gpu.power, 'W')} / {F.value(gpu.powerLimit, 'W')}</Text>
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            <Text color={temperatureColour(gpu.temperature)}>GPU {F.temperature(gpu.temperature)} · VRAM {F.temperature(gpu.memoryTemperature)}</Text>
            <Text color={palette.muted}>{F.bytes(gpu.memoryUsed)} / {F.bytes(gpu.memoryTotal)}</Text>
            <Text color={palette.faint}>{gpu.sharedMemory ? 'Shared system memory' : 'Dedicated graphics memory'}</Text>
          </Box>
        </Box>
        {height >= 16 && gpu.telemetryMessage && <Text color={palette.muted} wrap="truncate-end">{F.label(gpu.telemetryMessage)}</Text>}
        <Text color={palette.faint}>LOAD HISTORY · peak {F.percent(history.peak(`gpu.${gpu.id}.usage`))}</Text>
        <Sparkline points={history.get(`gpu.${gpu.id}.usage`)} width={width - 4} colour={palette.graphics} ascii={ascii} />
        {height >= 13 && <>
          <Text color={palette.faint}>TEMPERATURE HISTORY · peak {F.temperature(history.peak(`gpu.${gpu.id}.temperature`))}</Text>
          <Sparkline points={history.get(`gpu.${gpu.id}.temperature`)} width={width - 4} colour={palette.sensors} ascii={ascii} maximum={120} />
        </>}
      </>}
    </Panel>;
  }
}
