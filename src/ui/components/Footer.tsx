import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import type { Snapshot } from '../../domain/snapshot.ts';
import { palette } from '../theme/palette.ts';
import { ActivityIndicator } from './ActivityIndicator.tsx';

interface Props { readonly snapshot: Snapshot; readonly interval: number; readonly paused: boolean; readonly motion: boolean; readonly ascii: boolean; readonly width: number }

export class Footer extends PureComponent<Props> {
  public override render(): ReactNode {
    const { snapshot, interval, paused, motion, ascii, width } = this.props;
    return <Box height={2} flexDirection="column" flexShrink={0} paddingX={1}>
      <Box columnGap={1}>
        <ActivityIndicator paused={paused} motion={motion} ascii={ascii} />
        <Text color={paused ? palette.warning : palette.text}>{paused ? 'PAUSED' : 'LIVE'}</Text>
        {Object.entries(snapshot.readings).map(([name, reading]) => <Text key={name} color={reading.status === 'live' ? palette.faint : palette.warning}>{name === 'graphics' ? 'gpu' : name === 'memory' ? 'ram' : name} {reading.status === 'live' ? 'ok' : reading.status}</Text>)}
        <Text color={palette.faint}>{(interval / 1000).toFixed(2)}s</Text>
      </Box>
      <Text color={palette.muted} wrap="truncate-end">{width >= 100 ? '1–5 views   Tab next   ↑↓ scroll   ←→ GPU   P pause   R refresh   +/- rate   ? help   Q quit' : '1–5 views  ↑↓ scroll  ←→ GPU  P pause  ? help  Q quit'}</Text>
    </Box>;
  }
}
