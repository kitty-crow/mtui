import { PureComponent, type ReactNode } from 'react';
import { Text } from 'ink';
import { palette } from '../theme/palette.ts';
import { Glyphs } from '../theme/Glyphs.ts';

interface Props { readonly value: number | null; readonly width: number; readonly colour: string; readonly ascii: boolean }

/** A zero reading remains visible; missing measurements have no filled cells. */
export class Gauge extends PureComponent<Props> {
  public override render(): ReactNode {
    const { value, colour, ascii } = this.props;
    const width = Math.max(1, Math.floor(this.props.width));
    const filled = Math.round(width * Math.min(100, Math.max(0, value ?? 0)) / 100);
    const glyphs = new Glyphs(ascii);
    return <Text><Text color={colour}>{glyphs.bar.repeat(filled)}</Text><Text color={palette.border}>{glyphs.track.repeat(width - filled)}</Text></Text>;
  }
}
