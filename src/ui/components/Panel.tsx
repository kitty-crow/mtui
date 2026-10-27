import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme/palette.ts';

interface Props {
  readonly title: string;
  readonly accent: string;
  readonly children: ReactNode;
  readonly height?: number;
  readonly hint?: string;
  readonly ascii: boolean;
}

/** Consistent, bounded section chrome for overview cards and detail screens. */
export class Panel extends PureComponent<Props> {
  public override render(): ReactNode {
    const { title, accent, children, height, hint, ascii } = this.props;
    const border = ascii ? { topLeft: '+', topRight: '+', bottomLeft: '+', bottomRight: '+', top: '-', bottom: '-', left: '|', right: '|' } : 'round';
    return <Box flexDirection="column" flexGrow={1} flexShrink={0} borderStyle={border} borderColor={palette.border} paddingX={1} height={height} overflow="hidden">
      <Box justifyContent="space-between" flexShrink={0}>
        <Text bold color={accent}>{title}</Text>
        <Text color={palette.muted} wrap="truncate-end">{hint ?? ''}</Text>
      </Box>
      {children}
    </Box>;
  }
}
