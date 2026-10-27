import { PureComponent, type ReactNode } from 'react';
import { Text } from 'ink';
import type { HistoryPoint } from '../../monitoring/HistoryStore.ts';
import { Glyphs } from '../theme/Glyphs.ts';

interface Props { readonly points: readonly HistoryPoint[]; readonly width: number; readonly colour: string; readonly ascii: boolean; readonly maximum?: number }

/** Fixed-scale sample history. Spaces mark unavailable or not-yet-sampled data. */
export class Sparkline extends PureComponent<Props> {
  public override render(): ReactNode {
    const { points, colour, ascii, maximum = 100 } = this.props;
    const width = Math.max(1, Math.floor(this.props.width));
    const levels = new Glyphs(ascii).blocks;
    const visible = points.slice(-width);
    const chart = visible.map(point => {
      if (point.value === null) return ' ';
      const index = Math.round(Math.min(1, Math.max(0, point.value / maximum)) * (levels.length - 1));
      return levels[index] ?? ' ';
    }).join('').padStart(width, ' ');
    return <Text color={colour}>{chart}</Text>;
  }
}
